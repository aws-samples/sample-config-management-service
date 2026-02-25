// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { QueryFailedException } from '../exceptions/query-failed.exception';

@Catch(QueryFailedException)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: QueryFailedException, host: ArgumentsHost) {
    this.logger.error(exception);

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus = exception.getStatus();
    const responseBody = exception.generateHttpResponseBody();

    exception.setTraceId(request.traceId);
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
