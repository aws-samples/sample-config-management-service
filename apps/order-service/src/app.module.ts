// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import {
  AllExceptionsFilter,
  BadRequestExceptionFilter,
  ForbiddenExceptionFilter,
  InternalServerErrorExceptionFilter,
  NotFoundExceptionFilter,
  UnauthorizedExceptionFilter,
  CustomValidationPipe,
} from '@shared/filters';
import { CognitoJwtGuard, TenantAccessGuard, AuthModule } from '@shared/auth';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { ConfigClientModule } from './config/config-client.module';
import { envConfig } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
    }),
    AuthModule,
    HealthModule,
    OrdersModule,
    ConfigClientModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: CognitoJwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantAccessGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: BadRequestExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ForbiddenExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: InternalServerErrorExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: NotFoundExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: UnauthorizedExceptionFilter,
    },
  ],
})
export class AppModule {
  // Note: Configuration loading happens on-demand when authenticated requests arrive
  // Cannot load configs on startup because JWT token is required
  // Configs are cached after first fetch per tenant
}
