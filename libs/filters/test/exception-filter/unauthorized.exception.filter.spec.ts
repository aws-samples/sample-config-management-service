// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { UnauthorizedExceptionFilter, UnauthorizedException } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('UnauthorizedExceptionFilter', () => {
  let filter: UnauthorizedExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [UnauthorizedExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<UnauthorizedExceptionFilter>(UnauthorizedExceptionFilter);
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
    let mockException: UnauthorizedException;
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockException = new UnauthorizedException({
        message: 'UNAUTHORIZED',
        code: 400,
        description: 'Access to this resource is denied',
      });
      mockException.getStatus = jest.fn().mockReturnValue(401);
      mockException.setTraceId = jest.fn();
      mockException.generateHttpResponseBody = jest.fn().mockReturnValue({
        error: 'UNAUTHORIZED',
        message: 'Unauthorized access',
        description: 'Access to this resource is denied',
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

    it('should handle UnauthorizedException correctly', () => {
      filter.catch(mockException, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockException);
      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockException.generateHttpResponseBody).toHaveBeenCalled();
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          error: 'UNAUTHORIZED',
          message: 'Unauthorized access',
          description: 'Access to this resource is denied',
          traceId: 'test-trace-id',
        },
        401,
      );
    });

    it('should handle exceptions without traceId', () => {
      mockRequest.traceId = undefined;

      filter.catch(mockException, mockHost);

      expect(mockException.setTraceId).toHaveBeenCalledWith(undefined);
    });

    it('should use the correct HTTP status code', () => {
      const customStatusCode = 403; // Forbidden
      mockException.getStatus = jest.fn().mockReturnValue(customStatusCode);

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.any(Object),
        customStatusCode,
      );
    });

    it('should log the exception', () => {
      filter.catch(mockException, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockException);
    });
  });
});
