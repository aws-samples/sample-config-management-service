// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';

import {
  ExceptionConstants,
  QueryErrorExceptionFilter,
  QueryFailedException,
} from '@shared/filters';
import { MockBaseLogger } from '../mocks/logger.mock';

jest.mock('@shared/filters', () => ({
  ...jest.requireActual('@shared/filters'),
  QueryFailedException: jest.fn().mockImplementation(() => ({
    setTraceId: jest.fn(),
    generateHttpResponseBody: jest.fn().mockReturnValue({
      error: 'GENERIC_DB_ERROR',
      message: 'Database error',
      description: 'Database Error',
      traceId: 'test-trace-id',
    }),
  })),
}));

describe('QueryErrorExceptionFilter', () => {
  let module: TestingModule;
  let filter: QueryErrorExceptionFilter;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [QueryErrorExceptionFilter],
    }).compile();

    filter = module.get<QueryErrorExceptionFilter>(QueryErrorExceptionFilter);
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
    let mockRequest: any;
    let mockResponse: any;
    let mockQueryFailedError: QueryFailedError;
    let mockQueryFailedException: QueryFailedException;

    beforeEach(() => {
      mockRequest = { traceId: 'test-trace-id' };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ArgumentsHost;

      mockQueryFailedError = new QueryFailedError('SQL query', [], {
        name: 'QueryFailedError',
        message: 'Database error',
      });
    });

    it('should be defined', () => {
      expect(filter).toBeDefined();
      expect(mockQueryFailedException).toBeUndefined();
    });

    it('should handle generic database error', () => {
      filter.catch(mockQueryFailedError, mockHost);
      mockQueryFailedException = new QueryFailedException({
        message: 'Database error',
        cause: mockQueryFailedError,
        description: 'Database Error',
        code: ExceptionConstants.DBExceptionCodes.GENERIC_DB_ERROR,
      });

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockQueryFailedError);
      expect(QueryFailedException).toHaveBeenCalledWith({
        message: 'Database error',
        cause: mockQueryFailedError,
        description: 'Database Error',
        code: ExceptionConstants.DBExceptionCodes.GENERIC_DB_ERROR,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Database error',
        description: 'Database Error',
        traceId: 'test-trace-id',
        code: ExceptionConstants.DBExceptionCodes.GENERIC_DB_ERROR,
      });
    });

    it('should handle string or binary data truncated error', () => {
      (mockQueryFailedError.driverError as any).number = 8152;
      mockQueryFailedException = new QueryFailedException({
        message: 'Database error',
        cause: mockQueryFailedError,
        description: 'Database Error',
        code: ExceptionConstants.DBExceptionCodes.STRING_OR_BINARY_DATA_TRUNCATED,
      });

      filter.catch(mockQueryFailedError, mockHost);

      expect(QueryFailedException).toHaveBeenCalledWith({
        message: 'Database error',
        cause: mockQueryFailedError,
        description: 'Database Error',
        code: ExceptionConstants.DBExceptionCodes.STRING_OR_BINARY_DATA_TRUNCATED,
      });
    });
  });
});
