// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ClientOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const grpcConfigOptions: ClientOptions = {
  transport: Transport.GRPC,
  options: {
    url: `0.0.0.0:${process.env.GRPC_PORT || 5000}`,
    package: 'configuration',
    protoPath: join(__dirname, '../../../libs/proto/src/config-service/configuration.proto'),
  },
};
