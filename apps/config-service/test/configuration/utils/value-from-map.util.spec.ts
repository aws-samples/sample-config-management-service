// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CustomHttpException } from '@shared/filters';
import { getValueFromMap } from '../../../src/configuration/utils/value-from-map.util';

describe('getValueFromMap', () => {
  it('should return the correct key and value for a valid path', () => {
    const map = {
      dev: {
        config: {
          setting: 'value1',
        },
      },
      prod: {
        config: {
          setting: 'value2',
        },
      },
    };
    const result = getValueFromMap(map, 'param_config_/dev/config/setting');
    expect(result).toEqual({ key: 'setting', value: 'value1' });
  });

  it('should return undefined for a path that does not exist', () => {
    const map = {
      dev: {
        config: {
          setting: 'value1',
        },
      },
    };
    const result = getValueFromMap(map, 'param_config_/dev/config/nonexistent');
    expect(result).toBeUndefined();
  });

  it('should throw an CustomHttpException if path is empty', () => {
    const map = {
      dev: {
        config: {
          setting: 'value1',
        },
      },
    };
    expect(() => getValueFromMap(map, '')).toThrow(CustomHttpException);
  });

  it('should return undefined if path leads to undefined value', () => {
    const map = {
      dev: {
        config: {
          setting: undefined,
        },
      },
    };
    const result = getValueFromMap(map, 'param_config_/dev/config/setting');
    expect(result).toBeUndefined();
  });

  it('should return undefined if map does not have the specified key', () => {
    const map = {
      dev: {
        config: {
          setting: 'value1',
        },
      },
    };
    const result = getValueFromMap(map, 'param_config_/prod/config/setting');
    expect(result).toBeUndefined();
  });
});
