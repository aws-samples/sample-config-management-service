// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigClientService } from './config-client.service';

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: 'CONFIG_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: configService.get<string>('CONFIG_SERVICE_ENDPOINT'),
            package: 'configuration',
            protoPath: join(process.cwd(), 'libs/proto/src/config-service/configuration.proto'),
            keepalive: {
              keepaliveTimeMs: 120000,
              keepaliveTimeoutMs: 20000,
              keepalivePermitWithoutCalls: 1,
              http2MaxPingsWithoutData: 0,
            },
          },
        }),
      },
    ]),
  ],
  providers: [ConfigClientService],
  exports: [ConfigClientService],
})
export class ConfigClientModule {}
