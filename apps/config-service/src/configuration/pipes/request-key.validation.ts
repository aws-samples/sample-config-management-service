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
import { KEY_CHECK_REQUEST_INVALID } from '../errors/input-validation.error';
import { RetrieveConfigRequest } from '@shared/proto';
import { keyPrefixes } from '../utils/constants';

@Injectable()
export class KeyValidationPipe implements PipeTransform<any> {
  constructor() {}

  async transform(value: RetrieveConfigRequest) {
    if (!value.key) {
      return;
    }
    this.validateKeyParameter(value.key);
    return value;
  }

  validateKeyParameter = (key: any) => {
    if (!key || typeof key !== 'string' || key.length === 0) {
      throw CustomHttpException.VALIDATION_ERROR(KEY_CHECK_REQUEST_INVALID.type.message);
    }

    if (!keyPrefixes.some((prefix) => key.startsWith(prefix))) {
      throw CustomHttpException.VALIDATION_ERROR(KEY_CHECK_REQUEST_INVALID.format.message);
    }
  };
}
