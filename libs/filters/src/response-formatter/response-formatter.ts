// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseFormatterInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseFormatterInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        let msg = 'Request processed successfully';
        if (data && data.status && data.data) {
          return data;
        }

        if (data && data.message) {
          msg = data.message;
        }

        return {
          status: 'success',
          data: Array.isArray(data.payload) ? data.payload : [data.payload],
          message: data.msg || msg,
        };
      }),
      // Kept for expansion point of view to handle the business validation errors
      // catchError((err) => {
      //     this.logger.error(err);
      //     return throwError(() => ({
      //         status: 'failed',
      //         data: [],
      //         message: err.message || 'An error occurred',
      //     }));
      // }),
    );
  }
}
