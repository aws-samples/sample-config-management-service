// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces';

/**
 * Decorator to extract the full authenticated user information from JWT token
 *
 * @returns The complete JWT payload of the authenticated user
 *
 * @example
 * ```typescript
 * @Controller('profile')
 * export class ProfileController {
 *   @Get()
 *   async getProfile(
 *     @CurrentUser() user: JwtPayload
 *   ) {
 *     return {
 *       email: user.email,
 *       tenantId: user['custom:tenantId'],
 *       role: user['custom:role']
 *     };
 *   }
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = getRequest(ctx);

    if (!request.user) {
      throw new Error('User not found in request context');
    }

    return request.user;
  },
);

/**
 * Helper function to get request from execution context
 * Supports both HTTP and gRPC contexts
 */
function getRequest(context: ExecutionContext): any {
  const type = context.getType();

  if (type === 'rpc') {
    // gRPC context
    return context.switchToRpc().getContext();
  } else {
    // HTTP context
    return context.switchToHttp().getRequest();
  }
}
