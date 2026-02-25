// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Configuration, TenantParamConfig } from '@shared/proto';

export const configuration: Configuration = {
  config: [
    {
      amcCode: 'Nippon',
      validations: [
        {
          zeroFundBalance: 'balanceAmount > minimumPurchaseAmount',
          minSIPAmount: 'minimumSIPAmount > 500',
        },
      ],
      paymentGateway: [
        {
          link: 'http://phonepe.com',
          name: 'UPI',
        },
      ],
    },
    {
      amcCode: 'default',
      validations: [
        {
          zeroFundBalance: 'balanceAmount > minimumPurchaseAmount',
          minSIPAmount: 'minimumSIPAmount > 500',
        },
      ],
      paymentGateway: [
        {
          link: 'http://phonepe.com',
          name: 'UPI',
        },
      ],
    },
  ],
  pk: 'tenant',
  sk: 'tenant',
};

export const configuration2: Configuration = {
  config: [
    {
      validations: [
        {
          zeroFundBalance: 'balanceAmount > minimumPurchaseAmount',
          minSIPAmount: '1000',
        },
        {
          zeroFundBalance: 'false',
          minSIPAmount: 'minimumSIPAmount > 500',
        },
      ],
      paymentGateway: [
        {
          link: 'http://phonepe.com',
          name: 'UPI',
        },
      ],
      amcCode: 'Motilal',
    },
    {
      validations: [
        {
          zeroFundBalance: 'balanceAmount > minimumPurchaseAmount',
          minSIPAmount: '',
        },
        {
          zeroFundBalance: '',
          minSIPAmount: 'minimumSIPAmount > 500',
        },
      ],
      paymentGateway: [
        {
          link: 'http://phonepe.com',
          name: 'UPI',
        },
      ],
      amcCode: 'default',
    },
  ],
  pk: 'tenant',
  sk: 'tenant1',
};

export const configResponse: TenantParamConfig = {
  tenant: configuration,
};

export const normalSSMResponse: TenantParamConfig = {
  parameters: [
    {
      key: '/dev/kfin/database/host',
      value: '10.40.60.50',
    },
  ],
};

export const secretSSMResponse: TenantParamConfig = {
  parameters: [
    {
      key: '/dev/kfin/database/username',
      value: 'admin',
    },
    {
      key: '/dev/kfin/database/password',
      value: 'K@!T$Ch',
    },
  ],
};

export const mockSSMResponse = {
  $metadata: {
    httpStatusCode: 200,
    requestId: '4e75a736-8640-46ff-bd35-7ddb33e080ca',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
  Parameters: [
    {
      ARN: 'arn:aws:ssm:ap-south-1:234567890987:parameter/dev/kfin/database/host',
      DataType: 'text',
      LastModifiedDate: '2024-07-09T17:56:38.016Z',
      Name: '/dev/kfin/database/username',
      Type: 'String',
      Value: 'admin',
      Version: 1,
    },
    {
      ARN: 'arn:aws:ssm:ap-south-1:234567890987:parameter/dev/kfin/database/port',
      DataType: 'text',
      LastModifiedDate: '2024-07-09T17:57:12.621Z',
      Name: '/dev/kfin/database/password',
      Type: 'String',
      Value: 'K@!T$Ch',
      Version: 1,
    },
  ],
};

export const mockSSMResponse2 = {
  $metadata: {
    httpStatusCode: 200,
    requestId: 'd1fab466-921d-4e8c-8afa-99b4702f6b0d',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
  Parameters: [
    {
      ARN: 'arn:aws:ssm:ap-south-1:381492024444:parameter/dev/kfin/karvy/host',
      DataType: 'text',
      LastModifiedDate: '2024-07-09T17:56:38.016Z',
      Name: '/dev/kfin/karvy/host',
      Type: 'String',
      Value: '10.41.66.51',
      Version: 1,
    },
    {
      ARN: 'arn:aws:ssm:ap-south-1:381492024444:parameter/dev/kfin/karvy/port',
      DataType: 'text',
      LastModifiedDate: '2024-07-09T17:57:12.621Z',
      Name: '/dev/kfin/karvy/port',
      Type: 'String',
      Value: '16999',
      Version: 1,
    },
  ],
  NextToken: 'dsafghgfngbfvdceryhjuhnbgfvdc',
};

export const mockSSMResponse3 = {
  $metadata: {
    httpStatusCode: 200,
    requestId: '4e75a736-8640-46ff-bd35-7ddb33e080ca',
    extendedRequestId: undefined,
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
  Parameters: [],
};
