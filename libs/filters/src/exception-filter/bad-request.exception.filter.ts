// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationError } from 'class-validator';

import { BadRequestException } from '../exceptions/bad-request.exception';

@Catch(BadRequestException)
export class BadRequestExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BadRequestException.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    this.logger.error(exception);

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const httpStatus = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    let validationError: string[] = [];
    if (Array.isArray(exceptionResponse.message)) {
      validationError = this.flatterValidationErrors(exceptionResponse.message);
    } else {
      validationError = [exceptionResponse.message];
    }

    exception.setTraceId(request.traceId);
    const responseBody = exception.generateHttpResponseBody(validationError);
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  private flatterValidationErrors(errors: ValidationError[]): string[] {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors.reduce<string[]>((acc, err) => {
      if (err.children && err.children.length > 0) {
        acc.push(...this.flatterValidationErrors(err.children));
      }
      if (err.constraints) {
        acc.push(...Object.values(err.constraints));
      }
      return acc;
    }, []);
  }
}
