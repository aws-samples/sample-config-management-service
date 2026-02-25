// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const initSwagger = (app: INestApplication) => {
  const CONFIG = new DocumentBuilder()
    .setTitle('Config Service')
    .setDescription('Config API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: 'Default JWT Authorization',
        type: 'http',
        name: 'authorization',
        in: 'header',
        scheme: 'Bearer',
        bearerFormat: 'Bearer',
      },
      'JWT-auth',
    )
    .build();

  const DOCUMENT = SwaggerModule.createDocument(app, CONFIG);
  SwaggerModule.setup('api', app, DOCUMENT);
};
