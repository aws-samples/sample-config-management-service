// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'class-validator';

import { BadRequestException } from '../exceptions/bad-request.exception';

@Catch(ValidationError)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: ValidationError, host: ArgumentsHost): void {
    this.logger.error(exception);

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;
    const errorMsg = exception.constraints || exception.children[0].constraints;

    const err = BadRequestException.VALIDATION_ERROR(Object.values(errorMsg)[0]);

    const responseBody = {
      error: err.code,
      message: err.message,
      traceId: request.traceId,
    };
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
