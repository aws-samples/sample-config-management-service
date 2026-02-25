// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ConfigService } from '@nestjs/config';

export const envConfig = () => {
  const configService = new ConfigService();

  return {
    port: <number>configService.get('PORT') || 3000,
    configTable: <string>configService.getOrThrow('DYNAMO_CONFIG_TABLE'),
    ssmPath: <string>configService.getOrThrow('SSM_PATH'),
  };
};
