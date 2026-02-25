// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ConfigurationService } from '../../../src/configuration/services/configuration.service';
import { CustomHttpException, ExceptionConstants } from '@shared/filters';
import { SSMConfigStrategy } from '../../../src/configuration/strategy/ssm-config.strategy';
import { Secret, TenantParamConfig } from '@shared/proto';
import { mockConfigService, MockLogger } from '../../mocks/configuration-service.mock';

describe('SSMConfigStrategy', () => {
  const input: Secret[] = [
    { key: '/dev/kfin/investor/service_name/key_name', value: 'value' },
    { key: '/dev/kfin/investor/service_name/key_name1', value: 'value1' },
    { key: '/dev/kfin/investor/service_name1/key_name1', value: 'value1' },
  ];

  let module: TestingModule;
  let ssmConfigStrategy: SSMConfigStrategy;
  let configurationService: ConfigurationService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SSMConfigStrategy,
        {
          provide: ConfigurationService,
          useValue: {
            getSecretFromSSM: jest.fn().mockReturnValue(input),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        MockLogger,
      ],
    }).compile();

    ssmConfigStrategy = module.get<SSMConfigStrategy>(SSMConfigStrategy);
    configurationService = module.get<ConfigurationService>(ConfigurationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(ssmConfigStrategy).toBeDefined();
  });

  describe('loadParamters', () => {
    it('should load parameters and map them correctly', async () => {
      const mockParam = [
        { key: '/dev/kfin/investor/service_name/key_name', value: 'value' },
        { key: '/dev/kfin/investor/service_name/key_name1', value: 'value1' },
        { key: '/dev/kfin/investor/service_name1/key_name1', value: 'value1' },
      ];
      const mappedParam = {
        service_name: [
          {
            key: 'key_name',
            value: 'value',
          },
          {
            key: 'key_name1',
            value: 'value1',
          },
        ],
        service_name1: [
          {
            key: 'key_name1',
            value: 'value1',
          },
        ],
      };

      jest.spyOn(configurationService, 'getSecretFromSSM').mockResolvedValue(mockParam);

      await ssmConfigStrategy['loadParamters']();

      expect(ssmConfigStrategy['parameters']).toEqual(mappedParam);
      expect(configurationService.getSecretFromSSM).toHaveBeenCalledWith('/dev/kfin/');
    });
  });

  describe('getConfig', () => {
    beforeEach(async () => {
      ssmConfigStrategy['parameters'] = {
        verification: [
          { key: 'key_name', value: 'value' },
          { key: 'key_name_1', value: 'value_1' },
        ],
      };
    });

    it('should return the correct config for given serviceName and key', async () => {
      const result: TenantParamConfig = await ssmConfigStrategy.getConfig(
        'verification',
        'param_config_key_name',
      );
      expect(result).toEqual({
        parameters: [{ key: 'key_name', value: 'value' }],
      });
    });

    it('should throw an error if serviceName does not exist', async () => {
      await expect(ssmConfigStrategy.getConfig('invalidService', 'key_name')).rejects.toThrow(
        'No paramters found for invalidService',
      );
    });

    it('should throw an error if key does not exist in serviceName', async () => {
      await expect(ssmConfigStrategy.getConfig('verification', 'invalid_key')).rejects.toThrow(
        CustomHttpException.NOT_FOUND_ERROR(
          `No paramters found for verification & invalid_key`,
          `Key is wrong`,
          ExceptionConstants.BadRequestCodes.KEY_NOT_FOUND,
        ),
      );
    });

    it('should return all parameters if key is param_config_all', async () => {
      const result: TenantParamConfig = await ssmConfigStrategy.getConfig(
        'verification',
        'param_config_all',
      );

      expect(result).toEqual({
        parameters: [
          { key: 'key_name', value: 'value' },
          { key: 'key_name_1', value: 'value_1' },
        ],
      });
    });
  });

  describe('getConfigs', () => {
    beforeEach(async () => {
      ssmConfigStrategy['newParameters'] = {
        dev: {
          tenant: {
            investor: {
              key_name: 'value',
              key_name1: 'value1',
              key_name2: 'value2',
            },
          },
        },
      };
    });

    it('should return the correct config for given key', async () => {
      const result = await ssmConfigStrategy.getConfigs('/dev/tenant/investor/key_name');
      expect(result).toEqual({
        key_name: 'value',
      });
    });

    it('should throw error if key does not exist', async () => {
      await expect(
        ssmConfigStrategy.getConfigs('/dev/tenant/investor/key_name3'),
      ).rejects.toThrow(
        CustomHttpException.NOT_FOUND_ERROR(
          `No paramter found for /dev/tenant/investor/key_name3`,
          `Key is wrong`,
          ExceptionConstants.BadRequestCodes.KEY_NOT_FOUND,
        ),
      );
    });
  });

  describe('reloadConfig', () => {
    it('should reload parameters', async () => {
      const mockParam = [
        { key: '/dev/kfin/investor/service_name/key_name2', value: 'value2' },
        { key: '/dev/kfin/investor/service_name/key_name1', value: 'value1' },
        { key: '/dev/kfin/investor/service_name1/key_name1', value: 'value1' },
      ];
      const mappedParam = {
        service_name: [
          {
            key: 'key_name2',
            value: 'value2',
          },
          {
            key: 'key_name1',
            value: 'value1',
          },
        ],
        service_name1: [
          {
            key: 'key_name1',
            value: 'value1',
          },
        ],
      };

      jest.spyOn(configurationService, 'getSecretFromSSM').mockResolvedValue(mockParam);

      await ssmConfigStrategy.reloadConfig();

      expect(ssmConfigStrategy['parameters']).toEqual(mappedParam);
      expect(configurationService.getSecretFromSSM).toHaveBeenCalledWith('/dev/kfin/');
    });
  });
});
