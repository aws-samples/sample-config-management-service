// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CustomHttpException } from '@shared/filters';

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Safely get a nested property value from an object
 * This helper function prevents prototype pollution by validating keys
 */
const safeGetProperty = (obj: Record<string, any>, key: string): any => {
  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    return undefined;
  }
  return obj[key];
};

export const getValueFromMap = (map: Record<string, any>, path: string) => {
  const keys = path.replace('param_config_', '').split('/').filter(Boolean);
  if (!keys || keys.length === 0) {
    throw CustomHttpException.INTERNAL_SERVER_ERROR('Internal Server Error');
  }

  let current = map;
  for (const key of keys) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw CustomHttpException.VALIDATION_ERROR(`Invalid key: ${key}`);
    }
    
    const nextValue = safeGetProperty(current, key);
    if (nextValue === undefined) {
      return undefined;
    }
    current = nextValue;
  }

  return {
    key: keys[keys.length - 1],
    value: current as unknown as string,
  };
};
