// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

/**
 * JWT payload structure from AWS Cognito
 * Includes standard claims and custom tenant information
 */
export interface JwtPayload {
  /** User ID (Cognito username) */
  sub: string;

  /** User email address */
  email: string;

  /** Email verification status */
  email_verified?: boolean;

  /** Cognito username */
  'cognito:username': string;

  /** Custom claim: Tenant ID for multi-tenant isolation */
  'custom:tenantId': string;

  /** Custom claim: User role (admin, user, viewer) */
  'custom:role'?: string;

  /** Cognito user groups */
  'cognito:groups'?: string[];

  /** Issuer (Cognito User Pool URL) */
  iss: string;

  /** Audience (App Client ID) */
  aud: string;

  /** Token type (id or access) */
  token_use: 'id' | 'access';

  /** Authentication timestamp */
  auth_time: number;

  /** Expiration timestamp */
  exp: number;

  /** Issued at timestamp */
  iat: number;
}

/**
 * Tenant context extracted from JWT
 * Provides simplified access to tenant and user information
 */
export interface TenantContext {
  /** Tenant identifier */
  tenantId: string;

  /** User identifier */
  userId: string;

  /** User email address */
  email: string;

  /** User role */
  role?: string;

  /** User groups */
  groups?: string[];
}
