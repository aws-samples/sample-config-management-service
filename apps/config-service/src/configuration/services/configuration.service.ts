// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import * as dynamoose from 'dynamoose';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { Model } from 'dynamoose/dist/Model';
import { Span } from 'nestjs-otel';

import { Configuration, Secret } from '@shared/proto';
import { ConfigurationEntity } from '../entities/configuration.entity';
import { CustomHttpException, ExceptionConstants } from '@shared/filters';
import { SsmService } from '../../ssm/service/ssm.service';
import { configSchema } from '../schema/configuration.schema';

@Injectable()
export class ConfigurationService {
  private readonly configModel: Model<ConfigurationEntity>;

  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private ssm: SsmService,
  ) {
    const tableName: string = this.configService.getOrThrow('configTable');
    this.configModel = dynamoose.model<ConfigurationEntity>(tableName, configSchema, {
      create: false,
    });
  }

  @Span('gRPC-health-check')
  healthCheck(): string {
    this.logger.log('Health Check', ConfigurationService.name);
    return 'Healthy';
  }

  @Span('get-configuration-from-dynamodb')
  async getConfiguration(key: string): Promise<Configuration> {
    this.logger.log(`Getting Configuration for ${key}`, ConfigurationService.name);

    const data = await this.configModel.query('pk').eq('tenant').where('sk').eq(key).exec();
    if (data.length === 0) {
      throw CustomHttpException.NOT_FOUND_ERROR(
        `No configuration found for given tenant ${key}`,
        `Key is wrong`,
        ExceptionConstants.BadRequestCodes.TENANT_NOT_FOUND,
      );
    }

    this.logger.log(`Configuration found for ${key}`);

    return data[0];
  }

  @Span('get-configuration-by-tenant')
  async getConfigurationByTenant(tenantId: string, configKey: string): Promise<Configuration> {
    this.logger.log(
      `Getting configuration for tenant: ${tenantId}, key: ${configKey}`,
      ConfigurationService.name,
    );

    const pk = `TENANT#${tenantId}`;
    const sk = `CONFIG#${configKey}`;

    const data = await this.configModel
      .query('pk')
      .eq(pk)
      .where('sk')
      .eq(sk)
      .where('isActive')
      .eq(true)
      .exec();

    if (data.length === 0) {
      throw CustomHttpException.NOT_FOUND_ERROR(
        `No configuration found for tenant ${tenantId} and key ${configKey}`,
        `Invalid tenant or config key`,
        ExceptionConstants.BadRequestCodes.TENANT_NOT_FOUND,
      );
    }

    this.logger.log(`Configuration found for tenant ${tenantId}`);

    return data[0];
  }

  @Span('list-configurations-by-tenant')
  async listConfigurationsByTenant(tenantId: string): Promise<Configuration[]> {
    this.logger.log(
      `Listing all configurations for tenant: ${tenantId}`,
      ConfigurationService.name,
    );

    const pk = `TENANT#${tenantId}`;

    const data = await this.configModel.query('pk').eq(pk).where('isActive').eq(true).exec();

    this.logger.log(`Found ${data.length} configurations for tenant ${tenantId}`);

    return data;
  }

  @Span('get-secret-from-ssm')
  async getSecretFromSSM(req: string): Promise<Secret[]> {
    this.logger.log(`Getting Secret for ${req}`, ConfigurationService.name);

    const response = await this.ssm.getParameter(req);
    const data = response.map((param) => {
      const { Parameters } = param;
      return Parameters?.map((eachSecret) => ({
        key: eachSecret.Name,
        value: eachSecret.Value,
      }));
    });
    const params = data.flatMap((innerArray) => innerArray);

    this.logger.log(`Secret found for ${req}`);

    return params;
  }
}
