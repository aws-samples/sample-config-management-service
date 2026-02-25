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
import { IException, IHttpUnauthorizedExceptionResponse } from './exceptions.interface';

export class UnauthorizedException extends HttpException {
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
    example: `This error message indicates that the authentication token provided with the request has expired, and therefore the server cannot verify the users identity.`,
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

    super(exception.message, HttpStatus.UNAUTHORIZED, {
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

  generateHttpResponseBody = (message?: string): IHttpUnauthorizedExceptionResponse => {
    return {
      code: this.code,
      message: message || this.message,
      description: this.description,
      traceId: this.traceId,
    };
  };

  static TOKEN_EXPIRED_ERROR = (msg?: string) => {
    return new UnauthorizedException({
      message: msg || 'The authentication token provided has expired.',
      code: ExceptionConstants.UnauthorizedCodes.TOKEN_EXPIRED_ERROR,
    });
  };

  static UNAUTHORIZED_ACCESS = (description?: string) => {
    return new UnauthorizedException({
      message: 'Access to the requested resource is unauthorized.',
      code: ExceptionConstants.UnauthorizedCodes.UNAUTHORIZED_ACCESS,
      description,
    });
  };

  static RESOURCE_NOT_FOUND = (msg?: string) => {
    return new UnauthorizedException({
      message: msg || 'Resource Not Found',
      code: ExceptionConstants.UnauthorizedCodes.RESOURCE_NOT_FOUND,
    });
  };

  static USER_NOT_VERIFIED = (msg?: string) => {
    return new UnauthorizedException({
      message:
        msg ||
        'User not verified. Please complete verification process before attempting this action.',
      code: ExceptionConstants.UnauthorizedCodes.USER_NOT_VERIFIED,
    });
  };

  static UNEXPECTED_ERROR = (error: any) => {
    return new UnauthorizedException({
      message: 'An unexpected error occurred while processing the request. Please try again later.',
      code: ExceptionConstants.UnauthorizedCodes.UNEXPECTED_ERROR,
      cause: error,
    });
  };

  static INVALID_ISSUER = (msg?: any) => {
    return new UnauthorizedException({
      message: msg || 'Invalid Issuer',
      code: ExceptionConstants.UnauthorizedCodes.INVALID_ISSUER,
    });
  };

  static NO_TOKEN_PROVIDED = (msg?: any) => {
    return new UnauthorizedException({
      message: msg || 'No token provided',
      code: ExceptionConstants.UnauthorizedCodes.NO_TOKEN_PROVIDED,
    });
  };

  static INVALID_TOKEN = (msg?: any) => {
    return new UnauthorizedException({
      message: msg || 'Invalid token',
      code: ExceptionConstants.UnauthorizedCodes.INVALID_TOKEN,
    });
  };
}
