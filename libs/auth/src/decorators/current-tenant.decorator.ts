// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract tenant ID from the authenticated user's JWT token
 *
 * @returns The tenant ID of the authenticated user
 *
 * @example
 * ```typescript
 * @Controller('configurations')
 * export class ConfigurationController {
 *   @Get()
 *   async getConfig(
 *     @CurrentTenant() tenantId: string
 *   ) {
 *     return this.configService.getByTenant(tenantId);
 *   }
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = getRequest(ctx);

    // Try to get tenantId from request context (set by guards)
    if (request.tenantId) {
      return request.tenantId;
    }

    // Fallback to extracting from user JWT payload
    if (request.user && request.user['custom:tenantId']) {
      return request.user['custom:tenantId'];
    }

    throw new Error('Tenant ID not found in request context');
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
