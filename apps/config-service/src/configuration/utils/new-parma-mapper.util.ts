// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CustomHttpException } from '@shared/filters';

export interface InputItem<T = any> {
  key: string;
  value: T;
}

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Safely get or create a nested object property
 * This helper function prevents prototype pollution by using Object.create(null)
 */
const getOrCreateNestedObject = (obj: Record<string, any>, key: string): Record<string, any> => {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) {
    obj[key] = Object.create(null);
  }
  
  if (typeof obj[key] !== 'object' || obj[key] === null) {
    throw CustomHttpException.VALIDATION_ERROR(`Invalid path structure at: ${key}`);
  }
  
  return obj[key];
};

export const newParamMapper = <T = any>(
  input: InputItem<T>[],
  separator: string = '/',
  customTransform?: (key: string, value: T) => any,
): Record<string, any> => {
  const result: Record<string, any> = {};

  input.forEach(({ key, value }) => {
    const paths = key.split(separator).filter(Boolean);

    if (!paths || paths.length === 0) {
      throw CustomHttpException.VALIDATION_ERROR(`Invalid Key format`);
    }

    let current = result;

    paths.forEach((part, index) => {
      if (DANGEROUS_KEYS.includes(part)) {
        throw CustomHttpException.VALIDATION_ERROR(`Invalid key: ${part}`);
      }

      if (index === paths.length - 1) {
        current[part] = customTransform ? customTransform(key, value) : value;
      } else {
        current = getOrCreateNestedObject(current, part);
      }
    });
  });

  return result;
};
