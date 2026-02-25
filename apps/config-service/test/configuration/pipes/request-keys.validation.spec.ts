// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Test, TestingModule } from '@nestjs/testing';

import { CustomHttpException } from '@shared/filters';
import { CONFIG_CHECK_REQUEST_KEYS_INVALID } from '../../../src/configuration/errors/input-validation.error';
import { keyPrefixes } from '../../../src/configuration/utils/constants';
import { KeysValidationPipe } from '../../../src/configuration/pipes/request-keys.validation';
import { RetrieveConfigRequests } from '@shared/proto';

describe('KeysValidationPipe', () => {
  let keysValidationPipe: KeysValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeysValidationPipe],
    }).compile();
    keysValidationPipe = module.get<KeysValidationPipe>(KeysValidationPipe);
  });

  describe('transform', () => {
    it('should return nothing if keys is not provided', async () => {
      const value: RetrieveConfigRequests = {} as unknown as RetrieveConfigRequests;
      const result = await keysValidationPipe.transform(value);
      expect(result).toEqual(undefined);
    });

    it('should throw CustomHttpException if there is one key with an invalid prefix', async () => {
      const value: RetrieveConfigRequests = { keys: ['invalid_prefix_key'] };
      await expect(keysValidationPipe.transform(value)).rejects.toThrow(
        CustomHttpException.VALIDATION_ERROR(CONFIG_CHECK_REQUEST_KEYS_INVALID.format.message),
      );
    });

    it('should not throw an error if there is one key with a valid prefix', async () => {
      const value: RetrieveConfigRequests = { keys: [`${keyPrefixes[0]}_key`] };
      const result = await keysValidationPipe.transform(value);
      expect(result).toEqual(value);
    });

    it('should throw CustomHttpException if any of the keys are not strings', async () => {
      const value: RetrieveConfigRequests = {
        keys: ['param_config_key', 123 as any],
      };
      await expect(keysValidationPipe.transform(value)).rejects.toThrow(
        CustomHttpException.VALIDATION_ERROR(CONFIG_CHECK_REQUEST_KEYS_INVALID.type.message),
      );
    });

    it('should throw CustomHttpException if keys do not start with the same prefix', async () => {
      const value: RetrieveConfigRequests = {
        keys: [`${keyPrefixes[1]}_key1`, 'wrong_prefix_key'],
      };
      await expect(keysValidationPipe.transform(value)).rejects.toThrow(
        CustomHttpException.VALIDATION_ERROR(CONFIG_CHECK_REQUEST_KEYS_INVALID.samePrefix.message),
      );
    });

    it('should not throw an error if all keys start with the same valid prefix', async () => {
      const value: RetrieveConfigRequests = {
        keys: [`${keyPrefixes[1]}_key1`, `${keyPrefixes[1]}_key2`],
      };
      const result = await keysValidationPipe.transform(value);
      expect(result).toEqual(value);
    });
  });
});
