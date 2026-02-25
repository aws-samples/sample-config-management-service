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
import { CustomHttpException } from '@shared/filters';
import { DynamoDBConfigStrategy } from './dynamodb-config.strategy';
import { SSMConfigStrategy } from './ssm-config.strategy';
import { keyPrefixes } from '../utils/constants';

@Injectable()
export class ConfigStrategyFactory {
  constructor(
    private readonly dynamoDBConfigStrategy: DynamoDBConfigStrategy,
    private readonly ssmConfigStrategy: SSMConfigStrategy,
  ) {}

  private keyStrategyMap = new Map<string, ConfigStrategy>([
    [keyPrefixes[0], this.dynamoDBConfigStrategy],
    [keyPrefixes[1], this.ssmConfigStrategy],
  ]);

  getStrategy(key: string): ConfigStrategy {
    for (const [prefix, strategy] of this.keyStrategyMap.entries()) {
      if (key.startsWith(prefix)) {
        return strategy;
      }
    }

    throw CustomHttpException.VALIDATION_ERROR(`Invalid key format: ${key}`);
  }
}
