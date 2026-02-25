// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ConfigService } from '@nestjs/config';
import { Logger, Provider } from '@nestjs/common';
import { SSMClient } from '@aws-sdk/client-ssm';

import { ConfigStrategyFactory } from '../../src/configuration/strategy/config-strategy.factory';
import { DynamoDBConfigStrategy } from '../../src/configuration/strategy/dynamodb-config.strategy';
import { SSMConfigStrategy } from '../../src/configuration/strategy/ssm-config.strategy';
import { SsmService } from '../../src/ssm/service/ssm.service';

export const mockConfigService = {
  getOrThrow: jest.fn().mockImplementation((param) => {
    if (param === 'configTable') {
      return 'dev-configuration-table';
    } else if (param === 'SSM_PATH') {
      return '/dev/kfin/';
    }
    return '';
  }),
};

export const MockConfigService: Provider = {
  provide: ConfigService,
  useValue: mockConfigService,
};

export const mockSsmService = {
  getParameter: jest.fn(),
};

export const MockSsmService: Provider = {
  provide: SsmService,
  useValue: mockSsmService,
};

const mockSSMClient = {
  send: jest.fn(),
};

export const MockSSMClient: Provider = {
  provide: SSMClient,
  useValue: mockSSMClient,
};

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
};

export const MockLogger: Provider = {
  provide: Logger,
  useValue: mockLogger,
};

const mockDynamoDBConfigStrategy = {
  getConfig: jest.fn(),
};

export const MockDynamoDBConfigStrategy: Provider = {
  provide: DynamoDBConfigStrategy,
  useValue: mockDynamoDBConfigStrategy,
};

const mockSSMConfigStrategy = {
  getConfig: jest.fn(),
  getConfigs: jest.fn(),
  reloadConfig: jest.fn(),
};

export const MockSSMConfigStrategy: Provider = {
  provide: SSMConfigStrategy,
  useValue: mockSSMConfigStrategy,
};

const mockConfigStrategyFactory = {
  getStrategy: jest.fn(),
};

export const MockConfigStrategyFactory: Provider = {
  provide: ConfigStrategyFactory,
  useValue: mockConfigStrategyFactory,
};

export const mockDynamooseModel = {
  query: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};
