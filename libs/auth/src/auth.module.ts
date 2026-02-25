// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CognitoJwtGuard } from './guards/cognito-jwt.guard';
import { TenantAccessGuard } from './guards/tenant-access.guard';
import { JwtValidatorService } from './services/jwt-validator.service';

/**
 * Global authentication module providing Cognito JWT validation and tenant isolation
 *
 * This module exports:
 * - CognitoJwtGuard: Validates JWT tokens from AWS Cognito
 * - TenantAccessGuard: Enforces tenant isolation
 * - JwtValidatorService: Service for JWT validation logic
 *
 * Usage:
 * ```typescript
 * import { AuthModule } from '@shared/auth';
 *
 * @Module({
 *   imports: [AuthModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CognitoJwtGuard, TenantAccessGuard, JwtValidatorService],
  exports: [CognitoJwtGuard, TenantAccessGuard, JwtValidatorService],
})
export class AuthModule {}
