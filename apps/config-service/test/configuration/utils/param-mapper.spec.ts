// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Secret } from '@shared/proto';
import { paramMapper } from '../../../src/configuration/utils/param-mapper';

describe('paramMapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the correct mapping for a given params', () => {
    const input: Secret[] = [
      { key: '/dev/kfin/investor/service_name/key_name', value: 'value' },
      { key: '/dev/kfin/investor/service_name/key_name1', value: 'value1' },
      { key: '/dev/kfin/investor/service_name1/key_name1', value: 'value1' },
    ];

    const expectedOutput = {
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

    const result = paramMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should return correct mapping if one param only provided', () => {
    const input: Secret[] = [{ key: '/dev/kfin/investor/service_name/key_name', value: 'value' }];

    const expectedOutput = {
      service_name: [
        {
          key: 'key_name',
          value: 'value',
        },
      ],
    };

    const result = paramMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should return empty object for empty input', () => {
    const input: Secret[] = [];

    const expectedOutput = {};

    const result = paramMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should not consider wrong key', () => {
    const input: Secret[] = [
      { key: '/dev/kfin/key_name', value: 'value' },
      { key: '/dev/kfin/investor/service_name/key_name', value: 'value' },
    ];

    const expectedOutput = {
      service_name: [
        {
          key: 'key_name',
          value: 'value',
        },
      ],
    };

    const result = paramMapper(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should not consider if service name & key name missing', () => {
    const input: Secret[] = [
      { key: '/dev/kfin/key_name', value: 'value' },
      { key: '/dev/kfin/investor/key_name1', value: 'value1' },
      { key: '/dev/kfin/investor/service_name/key_name', value: 'value' },
    ];

    const expectedOutput = {
      key_name1: [{ key: 'key_name1', value: 'value1' }],
      service_name: [{ key: 'key_name', value: 'value' }],
    };

    const result = paramMapper(input);
    expect(result).toEqual(expectedOutput);
  });
});
