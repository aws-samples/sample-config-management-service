// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { status } from '@grpc/grpc-js';

import { CustomHttpException } from '../exceptions/grpc.exception';

@Catch(HttpException)
export class GrpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GrpcExceptionFilter.name);

  constructor() {}

  catch(exception: HttpException, host: ArgumentsHost): Observable<never> | void {
    this.logger.verbose(exception);

    const ctx = host.switchToRpc().getContext();
    const request = ctx.request;

    const grpcStatusCode = this.mapHttpToGrpcStatus(exception.getStatus());

    if (exception instanceof CustomHttpException) {
      const responseBody = exception.generateHttpResponseBody();
      const traceId = request?.traceId;

      if (traceId) {
        exception.setTraceId(traceId);
      }
      return throwError(() => ({
        code: grpcStatusCode,
        message: responseBody.message,
        details: JSON.stringify(responseBody),
      }));
    } else {
      const errResponse = exception.getResponse();
      const grpcMessage =
        typeof errResponse === 'string' ? errResponse : (errResponse as any).message;

      return throwError(() => ({
        code: grpcStatusCode,
        message: grpcMessage || exception.message,
        details: grpcMessage,
      }));
    }
  }

  // Fallback method to map HTTP status to gRPC status
  private mapHttpToGrpcStatus(httpStatus: number): number {
    const httpToGrpcStatusMap: Record<number, number> = {
      [HttpStatus.BAD_REQUEST]: status.INVALID_ARGUMENT,
      [HttpStatus.UNAUTHORIZED]: status.UNAUTHENTICATED,
      [HttpStatus.FORBIDDEN]: status.PERMISSION_DENIED,
      [HttpStatus.NOT_FOUND]: status.NOT_FOUND,
      [HttpStatus.CONFLICT]: status.ALREADY_EXISTS,
      [HttpStatus.GONE]: status.ABORTED,
      [HttpStatus.TOO_MANY_REQUESTS]: status.RESOURCE_EXHAUSTED,
      499: status.CANCELLED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: status.INTERNAL,
      [HttpStatus.NOT_IMPLEMENTED]: status.UNIMPLEMENTED,
      [HttpStatus.BAD_GATEWAY]: status.UNKNOWN,
      [HttpStatus.SERVICE_UNAVAILABLE]: status.UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: status.DEADLINE_EXCEEDED,
      [HttpStatus.HTTP_VERSION_NOT_SUPPORTED]: status.UNAVAILABLE,
      [HttpStatus.PAYLOAD_TOO_LARGE]: status.OUT_OF_RANGE,
      [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: status.CANCELLED,
      [HttpStatus.UNPROCESSABLE_ENTITY]: status.INVALID_ARGUMENT,
      [HttpStatus.I_AM_A_TEAPOT]: status.UNKNOWN,
      [HttpStatus.METHOD_NOT_ALLOWED]: status.CANCELLED,
      [HttpStatus.PRECONDITION_FAILED]: status.FAILED_PRECONDITION,
    };

    return httpToGrpcStatusMap[httpStatus] || status.UNKNOWN;
  }
}
