// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

/**
 * Metadata key for marking routes as public (no authentication required)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * User roles supported by the authentication system
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

/**
 * Cognito user groups
 */
export enum CognitoGroup {
  ADMINS = 'Admins',
  USERS = 'Users',
  VIEWERS = 'Viewers',
}

/**
 * JWT token cache configuration
 */
export const JWT_CACHE_CONFIG = {
  /** Maximum age for cached JWKS keys (10 minutes) */
  JWKS_CACHE_MAX_AGE: 600000,

  /** Enable JWKS rate limiting */
  JWKS_RATE_LIMIT: true,
};

/**
 * Error messages for authentication failures
 */
export const AUTH_ERROR_MESSAGES = {
  NO_TOKEN: 'Authentication token is required',
  INVALID_TOKEN: 'Invalid authentication token',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_TOKEN_TYPE: 'Invalid token type',
  MISSING_TENANT_ID: 'Missing tenantId in token claims',
  INVALID_SIGNATURE: 'Invalid token signature',
  TENANT_ACCESS_DENIED: 'Access denied: You can only access your own tenant data',
  USER_CONTEXT_REQUIRED: 'User context is required',
};
