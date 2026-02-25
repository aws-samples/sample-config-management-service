// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationService } from '../../../src/configuration/services/configuration.service';
import { DynamoDBConfigStrategy } from '../../../src/configuration/strategy/dynamodb-config.strategy';
import { MockLogger } from '../../mocks/configuration-service.mock';
import { configResponse, configuration } from '../../mocks/configuration-dto.mock';

describe('ConfigurationService', () => {
  let module: TestingModule;
  let dynamoDBConfigStrategy: DynamoDBConfigStrategy;
  let configurationService: ConfigurationService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DynamoDBConfigStrategy,
        {
          provide: ConfigurationService,
          useValue: {
            getConfiguration: jest.fn(),
          },
        },
        MockLogger,
      ],
    }).compile();

    dynamoDBConfigStrategy = module.get<DynamoDBConfigStrategy>(DynamoDBConfigStrategy);
    configurationService = module.get<ConfigurationService>(ConfigurationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(dynamoDBConfigStrategy).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return configuration data for given tenant', async () => {
      const serviceName = 'verification-serive';
      const key = 'tenant_config_tenant';

      jest.spyOn(configurationService, 'getConfiguration').mockResolvedValue(configuration);

      const result = await dynamoDBConfigStrategy.getConfig(serviceName, key);

      expect(configurationService.getConfiguration).toHaveBeenCalledWith('tenant');
      expect(result).toEqual(configResponse);
    });
  });
});
