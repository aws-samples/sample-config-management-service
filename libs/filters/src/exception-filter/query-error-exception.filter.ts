// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { ExceptionConstants } from '../exceptions/exceptions.constants';
import { QueryFailedException } from '../exceptions/query-failed.exception';

interface SqlServerError extends Error {
  number?: number;
}

@Catch(QueryFailedError)
export class QueryErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryErrorExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    this.logger.error(exception);

    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let code = ExceptionConstants.DBExceptionCodes.GENERIC_DB_ERROR;
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception.message;
    const sqlError = exception.driverError as SqlServerError;
    const errorCode = sqlError.number ?? 0;

    if (errorCode === 8152) {
      code = ExceptionConstants.DBExceptionCodes.STRING_OR_BINARY_DATA_TRUNCATED;
    }
    const queryFailedException = new QueryFailedException({
      message,
      code,
      cause: exception,
      description: 'Database Error',
    });

    queryFailedException.setTraceId(request.traceId);
    const responseBody = queryFailedException.generateHttpResponseBody();
    response.status(status).json(responseBody);
  }
}
