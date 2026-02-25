// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CustomHttpException } from '@shared/filters';
import { KEY_CHECK_REQUEST_INVALID } from '../../../src/configuration/errors/input-validation.error';
import { KeyValidationPipe } from '../../../src/configuration/pipes/request-key.validation';
import { RetrieveConfigRequest } from '@shared/proto';
import { keyPrefixes } from '../../../src/configuration/utils/constants';

describe('KeyValidationPipe', () => {
  let pipe: KeyValidationPipe;
  beforeEach(() => {
    pipe = new KeyValidationPipe();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the value if key is undefined', async () => {
    const request: RetrieveConfigRequest = {
      serviceName: 'service',
      key: undefined,
    };
    const result = await pipe.transform(request);
    expect(result).toEqual(request.key);
  });
  it('should throw a validation error if key is not a string', async () => {
    const request: RetrieveConfigRequest = {
      serviceName: 'service',
      key: 123 as any,
    };
    await expect(pipe.transform(request)).rejects.toThrow(
      CustomHttpException.VALIDATION_ERROR(KEY_CHECK_REQUEST_INVALID.type.message),
    );
  });
  it('should throw a validation error if key does not start with an allowed prefix', async () => {
    const request: RetrieveConfigRequest = {
      serviceName: 'service',
      key: 'invalid_key',
    };
    await expect(pipe.transform(request)).rejects.toThrow(
      CustomHttpException.VALIDATION_ERROR(KEY_CHECK_REQUEST_INVALID.format.message),
    );
  });
  it('should return the value if key is valid', async () => {
    const request: RetrieveConfigRequest = {
      serviceName: 'service',
      key: `${keyPrefixes[0]}_validkey`,
    };
    const result = await pipe.transform(request);
    expect(result).toEqual(request);
  });
});
