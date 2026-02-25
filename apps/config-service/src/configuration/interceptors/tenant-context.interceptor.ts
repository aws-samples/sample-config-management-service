// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor to inject tenant context into request data for gRPC calls
 * Extracts tenantId from metadata (set by guards) and makes it available to controllers
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const type = context.getType();

    if (type === 'rpc') {
      // Get gRPC metadata (modified by guards)
      const metadata = context.switchToRpc().getContext();

      // Get request data
      const data = context.switchToRpc().getData();

      // Inject tenantId into request data
      if (metadata?.tenantId) {
        data.tenantId = metadata.tenantId;
      } else if (metadata?.user?.['custom:tenantId']) {
        data.tenantId = metadata.user['custom:tenantId'];
      }
    }

    return next.handle();
  }
}
