// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import * as dynamoose from 'dynamoose';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions } from '@nestjs/microservices';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';

import { instance, LoggerMiddleware, otelSDK } from '@shared/logger';
import { AppModule } from './app.module';
import { grpcConfigOptions } from './config/grpcOption.config';
import { initSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: instance,
    }),
  });
  app.use(new LoggerMiddleware().use.bind(LoggerMiddleware));

  app.connectMicroservice<MicroserviceOptions>(grpcConfigOptions);

  const configService = app.get(ConfigService);
  const env: string = configService.get('NODE_ENV') || 'dev';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`],
        },
      },
    }),
  );

  app.enableCors({
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  if (configService.get('TRACING_ENABLED') == 'true') {
    otelSDK.start();
  }

  const ddb = new dynamoose.aws.ddb.DynamoDB();
  dynamoose.aws.ddb.set(ddb);

  if (env === 'dev') {
    initSwagger(app);
  }

  await app.startAllMicroservices();
  await app.listen(configService.get('PORT') as number);
}
void bootstrap();
