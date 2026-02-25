// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { ClientOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const getGrpcClientOptions = (configServiceEndpoint: string): ClientOptions => {
  return {
    transport: Transport.GRPC,
    options: {
      url: configServiceEndpoint,
      package: 'configuration',
      protoPath: join(__dirname, '../../../../libs/proto/src/config-service/configuration.proto'),
      keepalive: {
        keepaliveTimeMs: 120000,
        keepaliveTimeoutMs: 20000,
        keepalivePermitWithoutCalls: 1,
        http2MaxPingsWithoutData: 0,
      },
    },
  };
};
