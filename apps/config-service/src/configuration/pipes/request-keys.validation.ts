// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable, PipeTransform } from '@nestjs/common';

import { CustomHttpException } from '@shared/filters';
import { CONFIG_CHECK_REQUEST_KEYS_INVALID } from '../errors/input-validation.error';
import { keyPrefixes } from '../utils/constants';
import { RetrieveConfigRequests } from '@shared/proto';

@Injectable()
export class KeysValidationPipe implements PipeTransform<any> {
  constructor() {}

  async transform(value: RetrieveConfigRequests) {
    if (!value.keys) {
      return;
    }

    this.validateKeysParameter(value.keys);
    return value;
  }

  public validateKeysParameter(keys: string[]): void {
    const isSingleKey = keys.length === 1;
    const prefixValidation = isSingleKey
      ? (key: string) => keyPrefixes.some((prefix) => key.startsWith(prefix))
      : (key: string) => key.startsWith(keyPrefixes[1]);

    for (const key of keys) {
      if (typeof key !== 'string') {
        throw CustomHttpException.VALIDATION_ERROR(CONFIG_CHECK_REQUEST_KEYS_INVALID.type.message);
      }

      if (!prefixValidation(key)) {
        const errorMessage = isSingleKey
          ? CONFIG_CHECK_REQUEST_KEYS_INVALID.format.message
          : CONFIG_CHECK_REQUEST_KEYS_INVALID.samePrefix.message;

        throw CustomHttpException.VALIDATION_ERROR(errorMessage);
      }
    }
  }
}
