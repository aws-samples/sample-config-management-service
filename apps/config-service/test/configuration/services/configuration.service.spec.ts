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
import {
  MockLogger,
  mockConfigService,
  mockDynamooseModel,
  mockSsmService,
} from '../../mocks/configuration-service.mock';
import { SsmService } from '../../../src/ssm/service/ssm.service';
import {
  configuration,
  mockSSMResponse,
  secretSSMResponse,
} from '../../mocks/configuration-dto.mock';

jest.mock('dynamoose', () => ({
  model: jest.fn(() => mockDynamooseModel),
}));

describe('ConfigurationService', () => {
  let module: TestingModule;
  let configurationService: ConfigurationService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SsmService,
          useValue: mockSsmService,
        },
        MockLogger,
      ],
    }).compile();

    configurationService = module.get<ConfigurationService>(ConfigurationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(configurationService).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return OK', () => {
      const result = configurationService.healthCheck();
      expect(result).toEqual('Healthy');
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration data for given tenant', async () => {
      const reqData = 'tenant';
      mockDynamooseModel
        .query('pk')
        .eq('tenant')
        .where('sk')
        .eq(reqData)
        .exec.mockResolvedValue([configuration]);

      const result = await configurationService.getConfiguration(reqData);

      expect(result).toEqual(configuration);
      expect(mockDynamooseModel.query).toHaveBeenCalledWith('pk');
      expect(mockDynamooseModel.query().eq).toHaveBeenCalledWith('tenant');
      expect(mockDynamooseModel.query().where).toHaveBeenCalledWith('sk');
      expect(mockDynamooseModel.query().where().eq).toHaveBeenCalledWith('tenant');
    });

    it('should throw Error when no configuration found', async () => {
      const reqData = 'kfin';
      mockDynamooseModel
        .query('pk')
        .eq('tenant')
        .where('sk')
        .eq(reqData)
        .exec.mockResolvedValue([]);

      await expect(configurationService.getConfiguration(reqData)).rejects.toThrow(
        CustomHttpException.NOT_FOUND_ERROR(
          `No configuration found for given tenant ${reqData}`,
          `Key is wrong`,
          ExceptionConstants.BadRequestCodes.TENANT_NOT_FOUND,
        ),
      );
    });
  });

  describe('getSecretFromSSM', () => {
    it('should return secrets for given parameter path', async () => {
      const reqData = 'database';
      mockSsmService.getParameter.mockResolvedValue([mockSSMResponse]);

      const result = await configurationService.getSecretFromSSM(reqData);

      expect(mockSsmService.getParameter).toHaveBeenCalledWith(reqData);
      expect(result).toEqual(secretSSMResponse.parameters);
    });
  });
});
