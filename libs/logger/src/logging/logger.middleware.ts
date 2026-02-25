// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { context, trace } from '@opentelemetry/api';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use = (request: Request, response: Response, next: NextFunction): void => {
    const { ip, method, originalUrl } = request;
    const userAgent = request.get('user-agent') || '';

    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      const spanContext = currentSpan.spanContext();
      request.traceId = spanContext.traceId;
      request.spanId = spanContext.spanId;
    } else {
      request.traceId = 'no-trace';
      request.spanId = 'no-span';
    }

    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip}`,
      );
    });

    next();
  };
}

declare module 'express' {
  interface Request {
    spanId: string;
    traceId: string;
  }
}
