// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Test, TestingModule } from '@nestjs/testing';

import { ConfigStrategy } from '../../../src/configuration/strategy/config-strategy.interface';
import { ConfigStrategyFactory } from '../../../src/configuration/strategy/config-strategy.factory';
import { ConfigurationController } from '../../../src/configuration/controller/configuration.controller';
import { ConfigurationService } from '../../../src/configuration/services/configuration.service';
import { DynamoDBConfigStrategy } from '../../../src/configuration/strategy/dynamodb-config.strategy';
import {
  MockConfigStrategyFactory,
  MockDynamoDBConfigStrategy,
  MockLogger,
  MockSSMConfigStrategy,
} from '../../mocks/configuration-service.mock';
import { SSMConfigStrategy } from '../../../src/configuration/strategy/ssm-config.strategy';
import {
  configResponse,
  normalSSMResponse,
  secretSSMResponse,
} from '../../mocks/configuration-dto.mock';

describe('ConfigurationController', () => {
  let module: TestingModule;
  let controller: ConfigurationController;
  let service: ConfigurationService;
  let strategyFactory: ConfigStrategyFactory;
  let dynamoDBConfigStrategy: ConfigStrategy;
  let ssmConfigStrategy: ConfigStrategy;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [
        {
          provide: ConfigurationService,
          useValue: {
            healthCheck: jest.fn(),
            getConfiguration: jest.fn(),
            getSecretFromSSM: jest.fn(),
          },
        },
        MockConfigStrategyFactory,
        MockDynamoDBConfigStrategy,
        MockSSMConfigStrategy,
        MockLogger,
      ],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    service = module.get<ConfigurationService>(ConfigurationService);
    strategyFactory = module.get<ConfigStrategyFactory>(ConfigStrategyFactory);
    dynamoDBConfigStrategy = module.get<ConfigStrategy>(DynamoDBConfigStrategy);
    ssmConfigStrategy = module.get<ConfigStrategy>(SSMConfigStrategy);
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return Healthy', () => {
      jest.spyOn(service, 'healthCheck').mockReturnValue('Healthy');
      const result = controller.healthCheck();
      expect(result).toEqual({ data: 'Healthy' });
    });
  });

  describe('retrieveConfig', () => {
    it('should return tenant configuration', async () => {
      const req = {
        serviceName: 'verification-serive',
        key: 'tenant_config_tenant',
      };

      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(dynamoDBConfigStrategy);

      jest.spyOn(dynamoDBConfigStrategy, 'getConfig').mockResolvedValue(configResponse);

      const result = await controller.retrieveConfig(req);

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith(req.key);
      expect(dynamoDBConfigStrategy.getConfig).toHaveBeenCalledWith(req.serviceName, req.key);
      expect(result).toEqual({ data: configResponse });
    });

    it('should return param configuration', async () => {
      const req = {
        serviceName: 'database',
        key: 'param_config_host',
      };

      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(ssmConfigStrategy);

      jest.spyOn(ssmConfigStrategy, 'getConfig').mockResolvedValue(normalSSMResponse);

      const result = await controller.retrieveConfig(req);

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith(req.key);
      expect(ssmConfigStrategy.getConfig).toHaveBeenCalledWith(req.serviceName, req.key);
      expect(result).toEqual({ data: normalSSMResponse });
    });

    it('should return all param configuration', async () => {
      const req = {
        serviceName: 'database',
        key: 'param_config_all',
      };

      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(ssmConfigStrategy);

      jest.spyOn(ssmConfigStrategy, 'getConfig').mockResolvedValue(secretSSMResponse);

      const result = await controller.retrieveConfig(req);

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith(req.key);
      expect(ssmConfigStrategy.getConfig).toHaveBeenCalledWith(req.serviceName, req.key);
      expect(result).toEqual({ data: secretSSMResponse });
    });
  });

  describe('retrieveConfigs', () => {
    it('should return param configuration', async () => {
      const req = {
        keys: ['param_config_host'],
      };

      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(ssmConfigStrategy);

      jest.spyOn(ssmConfigStrategy, 'getConfigs').mockResolvedValue({
        host: '123',
      });

      const result = await controller.retrieveConfigs(req);

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith(req.keys[0]);
      expect(ssmConfigStrategy.getConfigs).toHaveBeenCalledWith(req.keys[0]);
      expect(result).toEqual({
        data: {
          host: '123',
        },
      });
    });

    it('should return empty reponse when key value is wrong', async () => {
      const req = { keys: ['param_config_-dev', 'param_config_-test'] };

      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(ssmConfigStrategy);

      jest.spyOn(ssmConfigStrategy, 'getConfigs').mockResolvedValue(undefined);

      const result = await controller.retrieveConfigs(req);

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith(req.keys[0]);
      expect(ssmConfigStrategy.getConfigs).toHaveBeenCalledWith(req.keys[0]);
      expect(result).toEqual({ data: {} });
    });
  });

  describe('refreshConfig', () => {
    it('should reload configuration', async () => {
      jest.spyOn(strategyFactory, 'getStrategy').mockReturnValue(ssmConfigStrategy);

      jest.spyOn(ssmConfigStrategy, 'reloadConfig');

      await controller.refreshConfig();

      expect(strategyFactory.getStrategy).toHaveBeenCalledWith('param_config_');
      expect(ssmConfigStrategy.reloadConfig).toHaveBeenCalled();
    });
  });
});
