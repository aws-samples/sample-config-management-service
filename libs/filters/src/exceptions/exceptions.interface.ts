// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

export interface IException {
  message: string | string[];
  code?: number;
  cause?: Error;
  description?: string;
  traceId?: string;
}

export interface IHttpBadRequestExceptionResponse {
  code: number;
  message: string | string[];
  description?: string;
  traceId: string;
  cause: Error;
}

export interface IHttpUnauthorizedExceptionResponse {
  code: number;
  message: string;
  description?: string;
  traceId: string;
}

export interface IHttpForbiddenExceptionResponse {
  code: number;
  message: string;
  description?: string;
  traceId: string;
}

export interface IHttpNotFoundExceptionResponse {
  code: number;
  message: string;
  description?: string;
  traceId: string;
}

export interface IHttpInternalServerErrorExceptionResponse {
  code: number;
  message: string;
  description?: string;
  traceId: string;
}
