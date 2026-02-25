// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { QueryFailedException, QueryFailedExceptionFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('QueryFailedExceptionFilter', () => {
  let module: TestingModule;
  let filter: QueryFailedExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [QueryFailedExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<QueryFailedExceptionFilter>(QueryFailedExceptionFilter);
    httpAdapterHost = module.get<HttpAdapterHost>(HttpAdapterHost);
    MockBaseLogger();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    let mockException: QueryFailedException;
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockException = new QueryFailedException({
        message: 'Query failed',
        code: 500,
        description: 'An error occurred during query execution',
      });
      mockException.getStatus = jest.fn().mockReturnValue(500);
      mockException.setTraceId = jest.fn();
      mockException.generateHttpResponseBody = jest.fn().mockReturnValue({
        error: 'QUERY_FAILED',
        message: 'Query failed',
        description: 'An error occurred during query execution',
        traceId: 'test-trace-id',
      });

      mockRequest = { traceId: 'test-trace-id' };
      mockResponse = {};
      mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ArgumentsHost;
    });

    it('should handle QueryFailedException correctly', () => {
      filter.catch(mockException, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockException);
      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockException.generateHttpResponseBody).toHaveBeenCalled();
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          error: 'QUERY_FAILED',
          message: 'Query failed',
          description: 'An error occurred during query execution',
          traceId: 'test-trace-id',
        },
        500,
      );
    });

    it('should handle exceptions without traceId', () => {
      mockRequest.traceId = undefined;

      filter.catch(mockException, mockHost);

      expect(mockException.setTraceId).toHaveBeenCalledWith(undefined);
    });

    it('should use the correct HTTP status code', () => {
      const customStatusCode = 400;
      mockException.getStatus = jest.fn().mockReturnValue(customStatusCode);

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
        customStatusCode,
      );
    });
  });
});
