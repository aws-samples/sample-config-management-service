// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Item } from 'dynamoose/dist/Item';

import { Config } from '@shared/proto';

export class ConfigurationEntity extends Item {
  /**
   * Partition Key: TENANT#{tenantId}
   * Example: TENANT#acme-corp
   */
  pk!: string;

  /**
   * Sort Key: CONFIG#{configType}
   * Example: CONFIG#payment-gateway
   */
  sk!: string;

  /**
   * Configuration data
   */
  config!: Array<Config>;

  /**
   * Soft delete flag
   * Default: true
   */
  isActive!: boolean;

  /**
   * Configuration version number
   * Default: 1
   */
  version!: number;

  /**
   * Creation timestamp
   */
  createdAt?: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;

  /**
   * Helper method to extract tenantId from pk
   * @returns tenantId string
   */
  getTenantId(): string {
    return this.pk.replace('TENANT#', '');
  }

  /**
   * Helper method to extract configType from sk
   * @returns configType string
   */
  getConfigType(): string {
    return this.sk.replace('CONFIG#', '');
  }
}
