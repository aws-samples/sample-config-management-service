// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { ExceptionConstants } from './exceptions.constants';
import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomHttpException extends HttpException {
  @ApiProperty({
    enum: ExceptionConstants.UnauthorizedCodes,
    description: 'Error code for the exception.',
    example: ExceptionConstants.UnauthorizedCodes.TOKEN_EXPIRED_ERROR,
  })
  public code: number;

  @ApiHideProperty()
  public cause: unknown;

  @ApiProperty({
    description: 'Error message for the exception.',
    example: 'The authentication token provided has expired.',
  })
  public message: string;

  @ApiProperty({
    description: 'A description of the error message.',
    example: 'The authentication token provided with the request has expired',
  })
  public description: string;

  @ApiProperty({
    description: 'Trace ID of the request',
    example: '65b5f773-df95-4ce5-a917-62ee832fcdd0',
  })
  public traceId: string; // Trace ID of the request

  constructor(
    statusCode: number,
    message: string,
    code: number,
    description?: string,
    cause?: unknown,
  ) {
    super(message, statusCode, { cause, description });
    this.code = code;
    this.message = message;
    this.description = description || '';
    this.cause = cause;
  }

  setTraceId(traceId: string) {
    this.traceId = traceId;
  }

  generateHttpResponseBody(overrideMessage?: string) {
    return {
      code: this.code,
      message: overrideMessage || this.message,
      description: this.description,
      traceId: this.traceId,
    };
  }

  static BAD_REQUEST(
    message: string,
    details?: string,
    code: number = ExceptionConstants.BadRequestCodes.MISSING_ATTRIBUTES,
    cause?: unknown,
  ) {
    const exception = new CustomHttpException(
      HttpStatus.BAD_REQUEST,
      message,
      code,
      details,
      cause,
    );
    return exception;
  }

  static UNAUTHORIZED(
    message: string,
    details?: string,
    code: number = ExceptionConstants.UnauthorizedCodes.UNAUTHORIZED_ACCESS,
    cause?: unknown,
  ) {
    const exception = new CustomHttpException(
      HttpStatus.UNAUTHORIZED,
      message,
      code,
      details,
      cause,
    );
    return exception;
  }

  static VALIDATION_ERROR = (
    message: string,
    details?: string,
    code: number = ExceptionConstants.BadRequestCodes.VALIDATION_ERROR,
    cause?: unknown,
  ) => {
    const exception = new CustomHttpException(
      HttpStatus.BAD_REQUEST,
      message,
      code,
      details,
      cause,
    );
    return exception;
  };

  static INTERNAL_SERVER_ERROR = (
    message: string,
    details?: string,
    code: number = ExceptionConstants.InternalServerErrorCodes.INTERNAL_SERVER_ERROR,
    cause?: unknown,
  ) => {
    const exception = new CustomHttpException(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      code,
      details,
      cause,
    );
    return exception;
  };

  static NOT_FOUND_ERROR = (
    message: string,
    details?: string,
    code: number = ExceptionConstants.BadRequestCodes.TENANT_NOT_FOUND,
    cause?: unknown,
  ) => {
    const exception = new CustomHttpException(HttpStatus.NOT_FOUND, message, code, details, cause);
    return exception;
  };

  static KARZA_API_ERROR = (
    message: string,
    details?: string,
    code: number = ExceptionConstants.InternalServerErrorCodes.KARZA_API_ERROR,
    cause?: unknown,
  ) => {
    const exception = new CustomHttpException(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      code,
      details,
      cause,
    );
    return exception;
  };

  static UTI_ITSL_API_ERROR = (
    message: string,
    details?: string,
    code: number = ExceptionConstants.InternalServerErrorCodes.UTI_ITSL_API_ERROR,
    cause?: unknown,
  ) => {
    const exception = new CustomHttpException(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      code,
      details,
      cause,
    );
    return exception;
  };

  // Add more factory methods as needed for different types of exceptions
}
