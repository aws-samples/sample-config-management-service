// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import {
  InternalServerErrorException,
  InternalServerErrorExceptionFilter,
} from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('InternalServerErrorExceptionFilter', () => {
  let module: TestingModule;
  let filter: InternalServerErrorExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [InternalServerErrorExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<InternalServerErrorExceptionFilter>(InternalServerErrorExceptionFilter);
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
    let mockException: InternalServerErrorException;
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockException = new InternalServerErrorException({
        message: 'Internal server error',
        code: 400,
        description: 'A bad request occurred',
        traceId: undefined,
      });
      mockException.getStatus = jest.fn().mockReturnValue(500);
      mockException.setTraceId = jest.fn();
      mockException.generateHttpResponseBody = jest.fn().mockReturnValue({
        status: 'error',
        message: 'Internal server error',
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

    it('should handle InternalServerErrorException correctly', () => {
      filter.catch(mockException, mockHost);

      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockException.generateHttpResponseBody).toHaveBeenCalled();
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'error',
          message: 'Internal server error',
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
      const customStatusCode = 503; // Service Unavailable
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
