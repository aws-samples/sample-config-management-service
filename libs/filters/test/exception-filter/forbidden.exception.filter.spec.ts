// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { ForbiddenException, ForbiddenExceptionFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('ForbiddenExceptionFilter', () => {
  let filter: ForbiddenExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ForbiddenExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<ForbiddenExceptionFilter>(ForbiddenExceptionFilter);
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
    let mockException: ForbiddenException;
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockException = new ForbiddenException({
        message: 'FORBIDDEN',
        code: 400,
        description: 'A bad request occurred',
        traceId: undefined,
      });
      mockException.getStatus = jest.fn().mockReturnValue(403);
      mockException.setTraceId = jest.fn();
      mockException.generateHttpResponseBody = jest.fn().mockReturnValue({
        status: 'failed',
        error: 'FORBIDDEN',
        message: 'Access denied',
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

    it('should handle ForbiddenException correctly', () => {
      filter.catch(mockException, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockException);
      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockException.generateHttpResponseBody).toHaveBeenCalled();
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'failed',
          error: 'FORBIDDEN',
          message: 'Access denied',
        },
        403,
      );
    });

    it('should use the correct HTTP status code', () => {
      const customStatusCode = 418;
      mockException.getStatus = jest.fn().mockReturnValue(customStatusCode);

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
        customStatusCode,
      );
    });

    it('should handle exceptions without traceId', () => {
      mockRequest.traceId = undefined;

      filter.catch(mockException, mockHost);

      expect(mockException.setTraceId).toHaveBeenCalledWith(undefined);
    });
  });
});
