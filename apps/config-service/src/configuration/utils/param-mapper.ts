// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { IParameterConfig } from '../interfaces/parmater-config.interface';
import { Secret } from '@shared/proto';

export const paramMapper = (input: Secret[]): IParameterConfig => {
  return input.reduce<IParameterConfig>((acc, { key, value }) => {
    const parts = key.split('/');

    // Ensure the parts array has at least 4 elements
    if (parts.length < 5) {
      return acc;
    }

    const serviceName = parts[4];
    const keyName = parts.pop();

    if (!serviceName || !keyName || serviceName.length === 0 || keyName.length === 0) {
      return acc;
    }

    if (!acc[serviceName]) {
      acc[serviceName] = [];
    }

    acc[serviceName].push({ key: keyName, value });

    return acc;
  }, {});
};
