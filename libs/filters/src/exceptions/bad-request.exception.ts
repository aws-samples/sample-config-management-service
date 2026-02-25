// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { ExceptionConstants } from './exceptions.constants';
import { IException, IHttpBadRequestExceptionResponse } from './exceptions.interface';

export class BadRequestException extends HttpException {
  @ApiProperty({
    enum: ExceptionConstants.BadRequestCodes,
    example: ExceptionConstants.BadRequestCodes.MISSING_ATTRIBUTES,
  })
  public code: number;

  @ApiHideProperty()
  public cause: Error;

  @ApiProperty({
    description: 'Message for the exception',
    example: 'Bad Request',
  })
  public message: string;

  @ApiProperty({
    description: 'Message for the exception',
    example: ['Pan Number is not valid', 'Name is required'],
  })
  public messages: string[];

  @ApiProperty({
    description: 'Message for the description',
    example: 'Pan Number is not valid',
  })
  public description: string;

  @ApiProperty({
    description: 'Trace ID of the request',
    example: '65rdataead-r4edc-56432dfrrs',
  })
  public traceId: string;

  constructor(exception: IException) {
    super(
      {
        code: exception.code,
        message: Array.isArray(exception.message) ? exception.message[0] : exception.message,
        traceId: exception.traceId,
        description: exception.description,
        cause: exception.cause,
      } as IHttpBadRequestExceptionResponse,
      HttpStatus.BAD_REQUEST,
    );
    this.message = exception.message instanceof Array ? exception.message[0] : exception.message;
    this.messages = exception.message instanceof Array ? exception.message : [exception.message];
    this.cause = exception.cause;
    this.code = exception.code;
    this.traceId = exception.traceId;
    this.description = exception.description;
  }

  setTraceId = (traceId: string): void => {
    this.traceId = traceId;
  };

  generateHttpResponseBody = (message?: string | string[]): IHttpBadRequestExceptionResponse => {
    return {
      code: this.code,
      message: this.messages || message,
      traceId: this.traceId,
      description: this.description,
      cause: this.cause,
    };
  };

  static HTTP_REQUEST_TIMEOUT = () => {
    return new BadRequestException({
      code: ExceptionConstants.BadRequestCodes.HTTP_REQUEST_TIMEOUT,
      message: 'Request Timeout',
      cause: new Error('Request Timeout'),
    });
  };

  static RESOURCE_ALREADY_EXISTS = (msg?: string, cause?: string, code?: number) => {
    return new BadRequestException({
      code: code || ExceptionConstants.BadRequestCodes.RESOURCE_ALREADY_EXISTS,
      message: msg || 'Resource already exists',
      cause: new Error(cause || 'Resource already exists'),
    });
  };

  static RESOURCE_NOT_FOUND = (msg?: string, cause?: string) => {
    return new BadRequestException({
      code: ExceptionConstants.BadRequestCodes.RESOURCE_ALREADY_EXISTS,
      message: msg || 'Resource not found',
      cause: new Error(cause || 'Resource not found'),
    });
  };

  static VALIDATION_ERROR = (msg?: string, cause?: string, code?: number) => {
    return new BadRequestException({
      code: code || ExceptionConstants.BadRequestCodes.VALIDATION_ERROR,
      message: msg || 'Validation error',
      cause: new Error(cause || 'Validation error'),
    });
  };

  static UNEXCEPTED_ERROR = (msg?: string, cause?: string) => {
    return new BadRequestException({
      code: ExceptionConstants.BadRequestCodes.UNEXCEPTED_ERROR,
      message: msg || 'Unexcepted error',
      cause: new Error(cause || 'Unexcepted error'),
    });
  };

  static INVALID_INPUT = (msg?: string, cause?: string) => {
    return new BadRequestException({
      code: ExceptionConstants.BadRequestCodes.INVALID_INPUT,
      message: `${msg} is invalid` || 'Invalid input',
      description: cause || 'Invalid input',
    });
  };

  static MISSING_ATTRIBUTES = (msg?: string, cause?: string, code?: number) => {
    return new BadRequestException({
      code: code || ExceptionConstants.BadRequestCodes.MISSING_ATTRIBUTES,
      message: `${msg} is missing` || 'Missing attributes',
      description: cause || 'Missing attributes',
    });
  };

  static TENANT_ID_MISSING = (msg?: string, cause?: string, code?: number) => {
    return new BadRequestException({
      code: code || ExceptionConstants.BadRequestCodes.TENANT_ID_MISSING,
      message: msg || 'Validation error',
      cause: new Error(cause || 'Validation error'),
    });
  };
}
