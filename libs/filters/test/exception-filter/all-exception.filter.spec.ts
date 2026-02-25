// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { AllExceptionsFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('AllExceptionsFilter', () => {
  let module: TestingModule;
  let filter: AllExceptionsFilter;
  let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [AllExceptionsFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
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
    let host: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        traceId: 'mock-trace-id',
      };
      mockResponse = {};
      host = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ArgumentsHost;
    });

    it('should handle HttpException', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      filter.catch(exception, host);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'UNKNOWN',
          message: 'Test error',
          description: undefined,
          traceId: 'mock-trace-id',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should handle non-HttpException', () => {
      const exception = new Error('Internal error');
      filter.catch(exception, host);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'failed',
          error: 'UNKNOWN',
          message: 'Internal error',
          description: undefined,
          traceId: 'mock-trace-id',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle exception with code', () => {
      const exception = { code: 'CUSTOM_ERROR', message: 'Custom error' };
      filter.catch(exception, host);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'failed',
          error: 'CUSTOM_ERROR',
          message: 'Custom error',
          description: undefined,
          traceId: 'mock-trace-id',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle exception with description', () => {
      const exception = { message: 'Test error', description: 'Detailed description' };
      filter.catch(exception, host);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'failed',
          error: 'UNKNOWN',
          message: 'Test error',
          description: 'Detailed description',
          traceId: 'mock-trace-id',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle exception without message', () => {
      const exception = {};
      filter.catch(exception, host);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          status: 'failed',
          error: 'UNKNOWN',
          message: 'Unknown Error',
          description: undefined,
          traceId: 'mock-trace-id',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
