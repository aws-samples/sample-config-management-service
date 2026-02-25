// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

import { ConfigStrategy } from './config-strategy.interface';
import { ConfigurationService } from '../services/configuration.service';
import { CustomHttpException, ExceptionConstants } from '@shared/filters';
import { IParameterConfig, MapValue } from '../interfaces/parmater-config.interface';
import { TenantParamConfig } from '@shared/proto';
import { keyPrefixes } from '../utils/constants';
import { paramMapper } from '../utils/param-mapper';
import { getValueFromMap } from '../utils/value-from-map.util';
import { newParamMapper } from '../utils/new-parma-mapper.util';

@Injectable()
export class SSMConfigStrategy implements ConfigStrategy {
  private parameters: IParameterConfig = {};

  private newParameters: Record<string, any> = {};

  constructor(
    private readonly logger: Logger,
    private readonly configurationService: ConfigurationService,
    private readonly configService: ConfigService,
  ) {
    this.loadParamters();
  }

  private async loadParamters() {
    const path = this.configService.getOrThrow<string>('SSM_PATH');
    const param = await this.configurationService.getSecretFromSSM(path);
    this.parameters = paramMapper(param);
    this.newParameters = newParamMapper(param);
  }

  async getConfig(serviceName: string, key: string): Promise<TenantParamConfig> {
    const serviceParam = this.parameters[serviceName];
    if (serviceParam === undefined) {
      throw CustomHttpException.VALIDATION_ERROR(`No parameters found for ${serviceName}`);
    }

    if (key === 'param_config_all') {
      return { parameters: serviceParam };
    }

    const keyRemovePrefix = key.slice(keyPrefixes[1].length);
    const pair = serviceParam.find((item) => item.key === keyRemovePrefix);
    if (!pair) {
      throw CustomHttpException.NOT_FOUND_ERROR(
        `No parameters found for ${serviceName} & ${key}`,
        `Key is wrong`,
        ExceptionConstants.BadRequestCodes.KEY_NOT_FOUND,
      );
    }

    return {
      parameters: [
        {
          key: pair.key,
          value: pair.value,
        },
      ],
    };
  }

  async getConfigs(key: string, tenantId?: string): Promise<MapValue> {
    // Build the full path: config-service/tenantId/environment/...
    const env = this.configService.get<string>('NODE_ENV', 'dev');
    const fullPath = tenantId
      ? `param_config_config-service/${tenantId}/${env}/${key.replace('param_config_', '')}`
      : key;

    this.logger.debug(`Looking up SSM parameter: ${fullPath}`);

    const param = getValueFromMap(this.newParameters, fullPath);
    if (param === undefined || !param?.key || !param?.value) {
      this.logger.log(`Parameter ${key} not found for tenant ${tenantId}`);
      throw CustomHttpException.NOT_FOUND_ERROR(
        `No parameter found for ${key}`,
        `Key is wrong`,
        ExceptionConstants.BadRequestCodes.KEY_NOT_FOUND,
      );
    }

    // Return with the actual SSM path as key
    const ssmPath = `/config-service/${tenantId}/${env}/${key.replace('param_config_', '').replace('/', '/')}`;
    return { [ssmPath]: param.value };
  }

  async reloadConfig(): Promise<void> {
    await this.loadParamters();
  }
}
