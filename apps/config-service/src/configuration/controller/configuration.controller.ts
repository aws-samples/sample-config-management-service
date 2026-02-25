// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  Controller,
  Logger,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';

import {
  ConfigServiceController,
  ConfigServiceControllerMethods,
  HealthCheckResponse,
  RetrieveConfigRequest,
  RetrieveConfigRequests,
  RetrieveConfigResponse,
  RetrieveConfigResponses,
} from '@shared/proto';
import { ConfigStrategyFactory } from '../strategy/config-strategy.factory';
import { ConfigurationService } from '../services/configuration.service';
import { GrpcExceptionFilter } from '@shared/filters';
import { KeyValidationPipe } from '../pipes/request-key.validation';
import { KeysValidationPipe } from '../pipes/request-keys.validation';
import { CognitoJwtGuard, TenantAccessGuard, Public } from '@shared/auth';
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor';

@Controller()
@ConfigServiceControllerMethods()
@UseFilters(GrpcExceptionFilter)
@UseGuards(CognitoJwtGuard, TenantAccessGuard)
@UseInterceptors(TenantContextInterceptor)
export class ConfigurationController implements ConfigServiceController {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly strategyFactory: ConfigStrategyFactory,
    private readonly logger: Logger,
  ) {}

  @Public()
  healthCheck(): HealthCheckResponse {
    const res = this.configurationService.healthCheck();
    return { data: res };
  }

  @UsePipes(KeyValidationPipe)
  async retrieveConfig(req: RetrieveConfigRequest): Promise<RetrieveConfigResponse> {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      this.logger.error('Tenant ID not found in request');
      throw new Error('Tenant ID not found in authentication context');
    }

    this.logger.log(`Tenant ${tenantId} retrieving config: ${req.key}`);
    const { serviceName, key } = req;
    const strategy = this.strategyFactory.getStrategy(key);
    const data = await strategy.getConfig(serviceName, key, tenantId);
    return { data };
  }

  @UsePipes(KeysValidationPipe)
  async retrieveConfigs(req: RetrieveConfigRequests): Promise<RetrieveConfigResponses> {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      this.logger.error('Tenant ID not found in request');
      throw new Error('Tenant ID not found in authentication context');
    }

    this.logger.log(`Tenant ${tenantId} retrieving configs for ${req.keys.length} keys`);
    const data = await Promise.all(
      req.keys.map(async (key) => {
        const strategy = this.strategyFactory.getStrategy(key);
        const response = await strategy.getConfigs(key, tenantId);
        return response || {};
      }),
    );

    const mergedData = Object.assign({}, ...data);
    return { data: mergedData };
  }

  @Public()
  async refreshConfig() {
    const strategy = this.strategyFactory.getStrategy('param_config_');
    await strategy.reloadConfig();
    this.logger.log('Parameters reloaded successfully');
  }
}
