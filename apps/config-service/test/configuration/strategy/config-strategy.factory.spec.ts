// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Test, TestingModule } from '@nestjs/testing';

import { ConfigStrategyFactory } from '../../../src/configuration/strategy/config-strategy.factory';
import { ConfigurationService } from '../../../src/configuration/services/configuration.service';
import { CustomHttpException } from '@shared/filters';
import { DynamoDBConfigStrategy } from '../../../src/configuration/strategy/dynamodb-config.strategy';
import {
  MockDynamoDBConfigStrategy,
  MockLogger,
  MockSSMConfigStrategy,
} from '../../mocks/configuration-service.mock';
import { SSMConfigStrategy } from '../../../src/configuration/strategy/ssm-config.strategy';
import { keyPrefixes } from '../../../src/configuration/utils/constants';

describe('ConfigStrategyFactory', () => {
  let module: TestingModule;
  let configStrategyFactory: ConfigStrategyFactory;
  let dynamoDBConfigStrategy: DynamoDBConfigStrategy;
  let ssmConfigStrategy: SSMConfigStrategy;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ConfigStrategyFactory,
        MockDynamoDBConfigStrategy,
        MockSSMConfigStrategy,
        MockLogger,
        {
          provide: ConfigurationService,
          useValue: {
            healthCheck: jest.fn(),
            getConfiguration: jest.fn(),
            getSecretFromSSM: jest.fn(),
          },
        },
      ],
    }).compile();

    configStrategyFactory = module.get<ConfigStrategyFactory>(ConfigStrategyFactory);
    dynamoDBConfigStrategy = module.get<DynamoDBConfigStrategy>(DynamoDBConfigStrategy);
    ssmConfigStrategy = module.get<SSMConfigStrategy>(SSMConfigStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(configStrategyFactory).toBeDefined();
  });

  it('should return DynamoDBConfigStrategy for keys starting with dynamodb prefix', () => {
    const key = `${keyPrefixes[0]}/some/key`;
    const strategy = configStrategyFactory.getStrategy(key);
    expect(strategy).toBe(dynamoDBConfigStrategy);
  });

  it('should return SSMConfigStrategy for keys starting with ssm prefix', () => {
    const key = `${keyPrefixes[1]}/some/key`;
    const strategy = configStrategyFactory.getStrategy(key);
    expect(strategy).toBe(ssmConfigStrategy);
  });

  it('should throw an error for invalid key prefix', () => {
    const key = 'invalid/prefix/key';
    expect(() => configStrategyFactory.getStrategy(key)).toThrow(
      CustomHttpException.VALIDATION_ERROR(`Invalid key format: ${key}`),
    );
  });
});
