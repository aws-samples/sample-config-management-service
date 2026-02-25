// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../interfaces';
import { AUTH_ERROR_MESSAGES, UserRole, CognitoGroup, IS_PUBLIC_KEY } from '../constants';

/**
 * Guard to enforce tenant isolation
 * Ensures users can only access data from their own tenant
 * Admin users can access all tenants
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  private readonly logger = new Logger(TenantAccessGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Validates that the user has access to the requested tenant
   *
   * @param context - Execution context
   * @returns true if access is granted, throws ForbiddenException otherwise
   */
  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public route accessed, skipping tenant access check');
      return true;
    }

    const request = this.getRequest(context);
    const user: JwtPayload = request.user;

    if (!user) {
      this.logger.warn('No user found in request context');
      throw new ForbiddenException(AUTH_ERROR_MESSAGES.USER_CONTEXT_REQUIRED);
    }

    const userTenantId = user['custom:tenantId'];
    const userRole = user['custom:role'];
    const userGroups = user['cognito:groups'] || [];

    // Admin users can access all tenants
    if (userRole === UserRole.ADMIN || userGroups.includes(CognitoGroup.ADMINS)) {
      this.logger.debug(`Admin user ${user.email} granted access to all tenants`);
      return true;
    }

    // Extract requested tenantId from request
    const requestedTenantId = this.extractRequestedTenantId(request);

    // If no specific tenant requested, use user's tenant
    if (!requestedTenantId) {
      request.tenantId = userTenantId;
      this.logger.debug(`No tenant specified, using user's tenant: ${userTenantId}`);
      return true;
    }

    // Verify user can only access their own tenant
    if (requestedTenantId !== userTenantId) {
      this.logger.warn(
        `Tenant access denied: User ${user.email} (tenant: ${userTenantId}) ` +
          `attempted to access tenant: ${requestedTenantId}`,
      );
      throw new ForbiddenException(AUTH_ERROR_MESSAGES.TENANT_ACCESS_DENIED);
    }

    this.logger.debug(`Tenant access granted for user ${user.email} to tenant ${userTenantId}`);
    return true;
  }

  /**
   * Extract request object from execution context
   * Supports both HTTP and gRPC contexts
   *
   * @param context - Execution context
   * @returns Request object
   */
  private getRequest(context: ExecutionContext): any {
    const type = context.getType();

    if (type === 'rpc') {
      // gRPC context - get the same metadata reference used by CognitoJwtGuard
      const metadata = context.switchToRpc().getContext();

      // If metadata already has user (set by CognitoJwtGuard), return it as-is
      if (metadata.user) {
        return metadata;
      }

      // Otherwise wrap it (for consistency)
      return { metadata };
    } else {
      // HTTP context
      return context.switchToHttp().getRequest();
    }
  }

  /**
   * Extract requested tenant ID from request
   * Checks multiple locations: body, params, query, data (gRPC)
   *
   * @param request - Request object
   * @returns Tenant ID or null if not found
   */
  private extractRequestedTenantId(request: any): string | null {
    // Check request body
    if (request.body?.tenantId) {
      return request.body.tenantId;
    }

    // Check request params (route parameters)
    if (request.params?.tenantId) {
      return request.params.tenantId;
    }

    // Check query params
    if (request.query?.tenantId) {
      return request.query.tenantId;
    }

    // For gRPC, check the data payload
    if (request.data?.tenantId) {
      return request.data.tenantId;
    }

    // Check if already set by another guard
    if (request.tenantId) {
      return request.tenantId;
    }

    return null;
  }
}
