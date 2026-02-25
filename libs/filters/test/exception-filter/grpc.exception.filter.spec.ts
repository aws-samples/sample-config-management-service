// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { status } from '@grpc/grpc-js';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomHttpException, ExceptionConstants, GrpcExceptionFilter } from '@shared/filters';
import { Observable } from 'rxjs';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('GrpcExceptionFilter', () => {
  let module: TestingModule;
  let filter: GrpcExceptionFilter;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [GrpcExceptionFilter],
    }).compile();

    filter = module.get<GrpcExceptionFilter>(GrpcExceptionFilter);
    MockBaseLogger();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    let mockHost: ArgumentsHost;

    beforeEach(() => {
      mockHost = {
        switchToRpc: () => ({ getContext: () => ({ request: { traceId: 'test-trace-id' } }) }),
      } as ArgumentsHost;
    });

    it('should handle CustomHttpException', (done) => {
      const mockException = new CustomHttpException(
        HttpStatus.UNAUTHORIZED,
        'Token expired',
        ExceptionConstants.UnauthorizedCodes.TOKEN_EXPIRED_ERROR,
        'The authentication token provided has expired',
        new Error('Token expiration'),
      );
      mockException.setTraceId = jest.fn();

      const result = filter.catch(mockException, mockHost) as Observable<never>;

      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');

      result.subscribe({
        error: (err) => {
          expect(err).toEqual({
            code: status.UNAUTHENTICATED,
            message: 'Token expired',
            details: JSON.stringify({
              code: ExceptionConstants.UnauthorizedCodes.TOKEN_EXPIRED_ERROR,
              message: 'Token expired',
              description: 'The authentication token provided has expired',
            }),
          });
          done();
        },
      });
    });

    it('should handle regular HttpException', (done) => {
      const mockException = new HttpException('Regular error', HttpStatus.NOT_FOUND);

      const result = filter.catch(mockException, mockHost) as Observable<never>;

      result.subscribe({
        error: (err) => {
          expect(err).toEqual({
            code: status.NOT_FOUND,
            message: 'Regular error',
            details: 'Regular error',
          });
          done();
        },
      });
    });

    it('should handle HttpException with object response', (done) => {
      const mockException = new HttpException(
        { message: 'Object error', someField: 'value' },
        HttpStatus.BAD_REQUEST,
      );

      const result = filter.catch(mockException, mockHost) as Observable<never>;

      result.subscribe({
        error: (err) => {
          expect(err).toEqual({
            code: status.INVALID_ARGUMENT,
            message: 'Object error',
            details: 'Object error',
          });
          done();
        },
      });
    });
  });

  describe('mapHttpToGrpcStatus', () => {
    it('should map known HTTP statuses to gRPC statuses', () => {
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.BAD_REQUEST)).toBe(
        status.INVALID_ARGUMENT,
      );
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.UNAUTHORIZED)).toBe(
        status.UNAUTHENTICATED,
      );
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.FORBIDDEN)).toBe(
        status.PERMISSION_DENIED,
      );
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.NOT_FOUND)).toBe(status.NOT_FOUND);
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.INTERNAL_SERVER_ERROR)).toBe(
        status.INTERNAL,
      );
    });

    it('should return UNKNOWN for unmapped HTTP statuses', () => {
      expect((filter as any).mapHttpToGrpcStatus(HttpStatus.PARTIAL_CONTENT)).toBe(status.UNKNOWN);
      expect((filter as any).mapHttpToGrpcStatus(599)).toBe(status.UNKNOWN);
    });
  });
});
