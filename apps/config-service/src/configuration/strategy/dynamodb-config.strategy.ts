// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable } from '@nestjs/common';

import { ConfigStrategy } from './config-strategy.interface';
import { ConfigurationService } from '../services/configuration.service';
import { TenantParamConfig } from '@shared/proto';
import { keyPrefixes } from '../utils/constants';

@Injectable()
export class DynamoDBConfigStrategy implements ConfigStrategy {
  constructor(private readonly configService: ConfigurationService) {}

  async getConfig(serviceName: string, key: string, tenantId?: string): Promise<TenantParamConfig> {
    if (!tenantId) {
      throw new Error('tenantId is required for DynamoDB strategy');
    }
    const configKey = key.slice(keyPrefixes[0].length);
    const tenantConfig = await this.configService.getConfigurationByTenant(tenantId, configKey);
    return { tenant: tenantConfig };
  }
}
