// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

export const KEY_CHECK_REQUEST_INVALID = {
  type: { message: 'key is invalid' },
  format: { message: 'key should start with tenant_config_, param_config_' },
  required: { message: 'key is required' },
};

export const CONFIG_CHECK_REQUEST_KEYS_INVALID = {
  type: { message: 'Keys type is invalid' },
  format: { message: 'Keys should start with tenant_conifg_, param_config_' },
  required: { message: 'Keys is required' },
  singleTenant: { message: 'Only one tenant_config_ is allowed in Keys' },
  samePrefix: {
    message: 'All Key should start with same prefix(param_config_)',
  },
};
