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
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtValidatorService } from '../services';
import { IS_PUBLIC_KEY, AUTH_ERROR_MESSAGES } from '../constants';
import { JwtPayload } from '../interfaces';

/**
 * Guard to validate JWT tokens from AWS Cognito
 * Extracts and validates JWT token from request metadata/headers
 * Supports both HTTP and gRPC contexts
 */
@Injectable()
export class CognitoJwtGuard implements CanActivate {
  private readonly logger = new Logger(CognitoJwtGuard.name);

  constructor(
    private readonly jwtValidator: JwtValidatorService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Validates the request contains a valid JWT token
   *
   * @param context - Execution context (HTTP or gRPC)
   * @returns true if authentication is successful, throws UnauthorizedException otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public route accessed, skipping authentication');
      return true;
    }

    // Extract request from context (supports HTTP and gRPC)
    const request = this.getRequest(context);

    // Extract JWT token from metadata/headers
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('No JWT token found in request');
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.NO_TOKEN);
    }

    try {
      // Validate JWT token with Cognito
      const payload: JwtPayload = await this.jwtValidator.validateToken(token);

      // Attach user info to request context
      request.user = payload;
      request.tenantId = payload['custom:tenantId'];

      this.logger.debug(`User authenticated: ${payload.email}, tenant: ${request.tenantId}`);

      return true;
    } catch (error) {
      this.logger.error('JWT validation failed', error);
      throw new UnauthorizedException(error.message || AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }
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
      // gRPC context - return metadata directly so we can modify it
      // This ensures changes persist across guards
      return context.switchToRpc().getContext();
    } else {
      // HTTP context
      return context.switchToHttp().getRequest();
    }
  }

  /**
   * Extract JWT token from request
   * Checks both gRPC metadata and HTTP headers
   *
   * @param request - Request object (can be metadata directly for gRPC)
   * @returns JWT token string or null if not found
   */
  private extractToken(request: any): string | null {
    // For gRPC - request IS the metadata object directly
    if (request.get && typeof request.get === 'function') {
      const authMetadata = request.get('authorization');

      if (authMetadata) {
        // Handle both array and string formats
        const authHeader = Array.isArray(authMetadata) ? authMetadata[0] : authMetadata;

        if (typeof authHeader === 'string') {
          if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }
          // Also support token without "Bearer " prefix
          return authHeader;
        }
      }
    }

    // Fallback: Check if request has metadata property (wrapped format)
    if (request.metadata) {
      const authMetadata = request.metadata.get
        ? request.metadata.get('authorization')
        : request.metadata.authorization;

      if (authMetadata) {
        const authHeader = Array.isArray(authMetadata) ? authMetadata[0] : authMetadata;

        if (typeof authHeader === 'string') {
          if (authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }
          return authHeader;
        }
      }
    }

    // For HTTP - token in headers
    if (request.headers?.authorization) {
      const authHeader = request.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    return null;
  }
}
