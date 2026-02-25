// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Secret } from '@shared/proto';
import { InputItem, newParamMapper } from '../../../src/configuration/utils/new-parma-mapper.util';
import { CustomHttpException } from '@shared/filters';

describe('paramMapper', () => {
  it('should return the correct mapping for a given params', () => {
    const input: Secret[] = [
      { key: '/dev/tenant/tenant/mf/key_name', value: 'value' },
      { key: '/dev/tenant/tenant/mf/key_name1', value: 'value1' },
      { key: '/dev/tenant/tenant/mf/key_name2', value: 'value2' },
    ];

    const expectedOutput = {
      dev: {
        tenant: {
          tenant: {
            mf: {
              key_name: 'value',
              key_name1: 'value1',
              key_name2: 'value2',
            },
          },
        },
      },
    };

    const result = newParamMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should return correct mapping if one param only provided', () => {
    const input: Secret[] = [{ key: '/dev/tenant/investor/key_name', value: 'value' }];

    const expectedOutput = {
      dev: {
        tenant: {
          investor: {
            key_name: 'value',
          },
        },
      },
    };

    const result = newParamMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should return empty object for empty input', () => {
    const input: Secret[] = [];

    const expectedOutput = {};

    const result = newParamMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should throw an error for invalid key format', () => {
    const input: InputItem<string>[] = [
      { key: '', value: 'value1' },
      { key: 'a/b/c', value: 'value2' },
    ];

    expect(() => newParamMapper(input)).toThrow(
      CustomHttpException.VALIDATION_ERROR('Invalid Key format'),
    );
  });
});
