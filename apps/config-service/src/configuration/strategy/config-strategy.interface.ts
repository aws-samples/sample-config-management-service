// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { TenantParamConfig } from '@shared/proto';
import { MapValue } from '../interfaces/parmater-config.interface';

export interface ConfigStrategy {
  getConfig(serviceName: string, key: string, tenantId?: string): Promise<TenantParamConfig>;
  getConfigs?(key: string, tenantId?: string): Promise<MapValue>;
  reloadConfig?(): Promise<void>;
}
