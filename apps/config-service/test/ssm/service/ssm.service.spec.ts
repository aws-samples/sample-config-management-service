// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  GetParametersByPathCommand,
  GetParametersByPathCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { Test, TestingModule } from '@nestjs/testing';
import { mockClient } from 'aws-sdk-client-mock';

import { CustomHttpException } from '@shared/filters';
import { MockLogger } from '../../mocks/configuration-service.mock';
import { SsmService } from '../../../src/ssm/service/ssm.service';
import { mockSSMResponse, mockSSMResponse3 } from '../../mocks/configuration-dto.mock';

describe('ConfigurationService', () => {
  let app: TestingModule;
  const mockSSMClient = mockClient(SSMClient);
  let ssmService: SsmService;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      providers: [
        SsmService,
        {
          provide: SSMClient,
          useValue: mockSSMClient,
        },
        MockLogger,
      ],
    }).compile();

    mockSSMClient.reset();
    ssmService = app.get<SsmService>(SsmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(ssmService).toBeDefined();
  });

  describe('getParametersByPath', () => {
    it('should return all secrets for given parameter path', async () => {
      const mockReqData = '/dev/kfin/database';
      mockSSMClient
        .on(GetParametersByPathCommand)
        .resolves(mockSSMResponse as unknown as GetParametersByPathCommandOutput);

      const result = await ssmService.getParameter(mockReqData);
      expect(result).toEqual([mockSSMResponse]);
    });

    it('should throw Error when no secret found for given parameter path', async () => {
      const mockReqData = '/test';
      mockSSMClient
        .on(GetParametersByPathCommand)
        .resolves(mockSSMResponse3 as unknown as GetParametersByPathCommandOutput);

      await expect(ssmService.getParameter(mockReqData)).rejects.toThrow(
        CustomHttpException.INTERNAL_SERVER_ERROR('Error loading params from AWS SSM'),
      );
    });

    it('should throw Error for other exceptions', async () => {
      mockSSMClient
        .on(GetParametersByPathCommand)
        .rejects(
          CustomHttpException.INTERNAL_SERVER_ERROR('Error Fetching parameters from AWS SSM'),
        );

      await expect(ssmService.getParameter('/test')).rejects.toThrow(
        CustomHttpException.INTERNAL_SERVER_ERROR('Error Fetching parameters from AWS SSM'),
      );
    });
  });
});
