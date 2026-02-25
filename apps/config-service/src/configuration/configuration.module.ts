// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Logger, Module } from '@nestjs/common';

import { ConfigStrategyFactory } from './strategy/config-strategy.factory';
import { ConfigurationController } from '../configuration/controller/configuration.controller';
import { ConfigurationService } from './services/configuration.service';
import { DynamoDBConfigStrategy } from './strategy/dynamodb-config.strategy';
import { SSMConfigStrategy } from './strategy/ssm-config.strategy';
import { SSMModule } from '../ssm/ssm.module';
import { SsmService } from '../ssm/service/ssm.service';

@Module({
  imports: [SSMModule],
  controllers: [ConfigurationController],
  providers: [
    ConfigurationService,
    SsmService,
    ConfigStrategyFactory,
    DynamoDBConfigStrategy,
    SSMConfigStrategy,
    Logger,
  ],
})
export class ConfigurationModule {}
