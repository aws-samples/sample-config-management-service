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
import { IException, IHttpForbiddenExceptionResponse } from './exceptions.interface';

export class ForbiddenException extends HttpException {
  @ApiProperty({
    enum: ExceptionConstants.ForbiddenCodes,
    description: 'You do not have permission to perform this action.',
    example: ExceptionConstants.ForbiddenCodes.MISSING_PERMISSIONS,
  })
  public code: number;

  @ApiHideProperty()
  public cause: Error;

  @ApiProperty({
    description: 'Message for the exception',
    example: 'You do not have permission to perform this action.',
  })
  public message: string;

  @ApiProperty({
    description: 'A description of the error message.',
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

    super(exception.message, HttpStatus.FORBIDDEN, {
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

  generateHttpResponseBody = (message?: string): IHttpForbiddenExceptionResponse => {
    return {
      code: this.code,
      message: message || this.message,
      description: this.description,
      traceId: this.traceId,
    };
  };

  static FORBIDDEN = (msg?: string) => {
    return new ForbiddenException({
      message: msg || 'Access to this resource is forbidden.',
      code: ExceptionConstants.ForbiddenCodes.FORBIDDEN,
    });
  };

  static MISSING_PERMISSIONS = (msg?: string) => {
    return new ForbiddenException({
      message: msg || 'You do not have permission to perform this action.',
      code: ExceptionConstants.ForbiddenCodes.MISSING_PERMISSIONS,
    });
  };
}
