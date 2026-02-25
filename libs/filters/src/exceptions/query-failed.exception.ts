// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { ExceptionConstants } from './exceptions.constants';
import { IException, IHttpInternalServerErrorExceptionResponse } from './exceptions.interface';

@Catch(QueryFailedError)
export class QueryFailedException extends HttpException {
  @ApiProperty({
    enum: ExceptionConstants.DBExceptionCodes,
    description: 'Error code for the exception.',
    example: ExceptionConstants.DBExceptionCodes.DUPLICATE_ENTRY,
  })
  public code: number;

  @ApiHideProperty()
  public cause: unknown;

  @ApiProperty({
    description: 'Error message for the exception.',
    example: 'Duplicate Record exists',
  })
  public message: string;

  @ApiProperty({
    description: 'A description of the error message.',
    example: 'Database Error',
  })
  public description: string;

  @ApiProperty({
    description: 'Trace ID of the request',
    example: '65b5f773-df95-4ce5-a917-62ee832fcdd0',
  })
  public traceId: string; // Trace ID of the request

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

  static DUPLICATE_ENTRY = (error: any) => {
    return new QueryFailedException({
      message: 'Duplicate Record exists',
      code: ExceptionConstants.DBExceptionCodes.DUPLICATE_ENTRY,
      cause: error,
    });
  };

  static FOREIGN_KEY_CONSTRAINT_FAILS = (error: any) => {
    return new QueryFailedException({
      message: 'Foreign key constraint fails',
      code: ExceptionConstants.DBExceptionCodes.FOREIGN_KEY_CONSTRAINT_FAILS,
      cause: error,
    });
  };

  static ADDRESS_UPDATE_ERROR = (error: any) => {
    return new QueryFailedException({
      message: 'Address Update Error',
      code: ExceptionConstants.DBExceptionCodes.ADDRESS_ADD_FAIL,
      cause: error,
    });
  };

  static STRING_OR_BINARY_DATA_TRUNCATED = (error: any) => {
    return new QueryFailedException({
      message: 'String or binary data would be truncated',
      code: ExceptionConstants.DBExceptionCodes.STRING_OR_BINARY_DATA_TRUNCATED,
      cause: error,
    });
  };
}
