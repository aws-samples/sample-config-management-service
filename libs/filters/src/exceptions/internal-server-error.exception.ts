// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { HttpException, HttpStatus } from '@nestjs/common';

import { ExceptionConstants } from './exceptions.constants';
import { IException, IHttpInternalServerErrorExceptionResponse } from './exceptions.interface';

export class InternalServerErrorException extends HttpException {
  @ApiProperty({
    enum: ExceptionConstants.InternalServerErrorCodes,
    description: 'A unique code identifying the error.',
    example: ExceptionConstants.InternalServerErrorCodes.INTERNAL_SERVER_ERROR,
  })
  public code: number;

  @ApiHideProperty()
  public cause: Error;

  @ApiProperty({
    description: 'Message for the exception',
    example: 'An unexpected error occurred while processing your request.',
  })
  public message: string;

  @ApiProperty({
    description: 'A description of the error message.',
    example: 'The server encountered an unexpected condition',
  })
  public description: string;

  @ApiProperty({
    description: 'Trace ID of the request',
    example: '65b5f773-df95-4ce5-a917-62ee832fcdd0',
  })
  public traceId: string;

  constructor(exception: IException) {
    const message = Array.isArray(exception.message)
      ? exception.message.join(', ')
      : exception.message;

    super(exception.message, HttpStatus.INTERNAL_SERVER_ERROR, {
      cause: exception.cause,
      description: exception.description,
    });
    this.message = message;
    this.cause = exception.cause;
    this.description = exception.description;
    this.code = exception.code;
  }

  setTraceId = (traceId: string) => {
    this.traceId = traceId;
  };

  generateHttpResponseBody = (message?: string): IHttpInternalServerErrorExceptionResponse => {
    return {
      code: this.code,
      message: message || this.message,
      description: this.description,
      traceId: this.traceId,
    };
  };

  static INTERNAL_SERVER_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: 'Please try again later or contact our support team for assistance.',
      code: ExceptionConstants.InternalServerErrorCodes.INTERNAL_SERVER_ERROR,
      cause: error,
    });
  };

  static UNEXPECTED_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: 'An unexpected error occurred while processing the request.',
      code: ExceptionConstants.InternalServerErrorCodes.UNEXCEPTED_ERROR,
      cause: error,
    });
  };

  static INVALID_UUID_FORMAT = (error: any) => {
    return new InternalServerErrorException({
      message: 'Invalid UUID format.',
      code: ExceptionConstants.InternalServerErrorCodes.INVALID_UUID_FORMAT,
      cause: error,
    });
  };

  static INVALID_URL_FORMAT = (error: any) => {
    return new InternalServerErrorException({
      message: 'Invalid URL format.',
      code: ExceptionConstants.InternalServerErrorCodes.INVALID_URL_FORMAT,
      cause: error,
    });
  };

  static INVALID_KRA_AUTH_CONFIG = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.INVALID_KRA_AUTH_CONFIG,
      cause: error,
    });
  };

  static EXTERNAL_API_ERROR = (error: any, code?: any) => {
    return new InternalServerErrorException({
      message: error || 'An unexpected error occurred while processing external calls.',
      code: code || ExceptionConstants.InternalServerErrorCodes.EXTERNAL_API_ERROR,
      cause: error,
    });
  };

  static CVL_KRA_CLIENT_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.CVL_KRA_CLIENT_ERROR,
      cause: error,
    });
  };

  static POS_CODE_NOT_FOUND_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.POS_CODE_NOT_FOUND,
      cause: error,
    });
  };

  static DATABASE_CONN_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.DATABASE_CONN_ERROR,
      cause: error,
    });
  };

  static CRYPTO_GENERATOR_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.CRYPTO_GENERATOR_ERROR,
      cause: error,
    });
  };

  static CRYPTO_ERROR = (error: any) => {
    return new InternalServerErrorException({
      message: error,
      code: ExceptionConstants.InternalServerErrorCodes.CRYPTO_ERROR,
      cause: error,
    });
  };

  static CONFIG_SERVER_ERROR = (error?: any) => {
    return new InternalServerErrorException({
      message: error || 'An unexpected error occurred while processing config calls',
      code: ExceptionConstants.InternalServerErrorCodes.CONFIG_SERVER_ERROR,
      cause: error,
    });
  };
}
