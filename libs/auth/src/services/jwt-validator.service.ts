// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';
import { JwtPayload } from '../interfaces';
import { AUTH_ERROR_MESSAGES, JWT_CACHE_CONFIG } from '../constants';

/**
 * Service for validating JWT tokens issued by AWS Cognito
 * Fetches public keys from Cognito's JWKS endpoint and validates token signatures
 */
@Injectable()
export class JwtValidatorService implements OnModuleInit {
  private readonly logger = new Logger(JwtValidatorService.name);

  private jwksClient: jwksClient.JwksClient;

  private readonly region: string;

  private readonly userPoolId: string;

  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID', '');
    this.issuer = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
  }

  /**
   * Initialize JWKS client on module initialization
   */
  onModuleInit() {
    if (!this.userPoolId) {
      this.logger.warn('COGNITO_USER_POOL_ID not configured. JWT validation will fail.');
      return;
    }

    const jwksUri = `${this.issuer}/.well-known/jwks.json`;

    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: JWT_CACHE_CONFIG.JWKS_CACHE_MAX_AGE,
      rateLimit: JWT_CACHE_CONFIG.JWKS_RATE_LIMIT,
    });

    this.logger.log(`JWT Validator initialized for User Pool: ${this.userPoolId}`);
  }

  /**
   * Validate a JWT token from Cognito
   *
   * @param token - JWT token string
   * @returns Decoded and validated JWT payload
   * @throws Error if token is invalid, expired, or has invalid signature
   */
  async validateToken(token: string): Promise<JwtPayload> {
    if (!this.jwksClient) {
      throw new Error('JWT Validator not initialized. Check COGNITO_USER_POOL_ID configuration.');
    }

    try {
      // Decode token header to get key ID (kid)
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        this.logger.error('Invalid token structure');
        throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }

      // Get the signing key from Cognito JWKS
      const key = await this.getSigningKey(decoded.header.kid);

      // Verify token signature and decode payload
      const payload = jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      }) as JwtPayload;

      // Validate required claims
      this.validateClaims(payload);

      this.logger.debug(
        `Token validated successfully for user: ${payload.email}, tenant: ${payload['custom:tenantId']}`,
      );

      return payload;
    } catch (error) {
      this.logger.error('Token validation failed', error);

      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED);
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(AUTH_ERROR_MESSAGES.INVALID_SIGNATURE);
      }

      throw error;
    }
  }

  /**
   * Get signing key from Cognito's JWKS endpoint
   *
   * @param kid - Key ID from token header
   * @returns Public key for signature verification
   */
  private async getSigningKey(kid: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err, key) => {
        if (err) {
          this.logger.error('Failed to get signing key', err);
          reject(new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN));
        } else {
          const signingKey = key?.getPublicKey();
          if (!signingKey) {
            reject(new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN));
          } else {
            resolve(signingKey);
          }
        }
      });
    });
  }

  /**
   * Validate JWT claims to ensure token integrity
   *
   * @param payload - Decoded JWT payload
   * @throws Error if required claims are missing or invalid
   */
  private validateClaims(payload: JwtPayload): void {
    // Validate token type
    if (payload.token_use !== 'id' && payload.token_use !== 'access') {
      this.logger.error(`Invalid token type: ${payload.token_use}`);
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN_TYPE);
    }

    // Validate tenant ID exists in custom claims
    if (!payload['custom:tenantId']) {
      this.logger.error('Missing tenantId in token claims');
      throw new Error(AUTH_ERROR_MESSAGES.MISSING_TENANT_ID);
    }

    // Validate expiration (additional check, jwt.verify already checks this)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      this.logger.error('Token has expired');
      throw new Error(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED);
    }

    this.logger.debug('All token claims validated successfully');
  }

  /**
   * Decode token without verification (for debugging purposes)
   * Do not use this for authentication - always use validateToken()
   *
   * @param token - JWT token string
   * @returns Decoded payload without signature verification
   */
  decodeTokenUnsafe(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      this.logger.error('Failed to decode token', error);
      return null;
    }
  }
}
