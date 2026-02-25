// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundExceptionFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('NotFoundExceptionFilter', () => {
  let filter: NotFoundExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [NotFoundExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<NotFoundExceptionFilter>(NotFoundExceptionFilter);
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
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = { traceId: 'test-trace-id' };
      mockResponse = {};
      mockHost = {
        switchToHttp: () => ({ getRequest: () => mockRequest, getResponse: () => mockResponse }),
      } as ArgumentsHost;
    });

    it('should handle NotFoundException correctly', () => {
      const mockException = new NotFoundException({
        message: 'Resource not found',
      });

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          message: 'Resource not found',
          traceId: 'test-trace-id',
        },
        HttpStatus.NOT_FOUND,
      );
    });

    it('should handle other HttpExceptions correctly', () => {
      const mockException = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          message: 'Bad Request',
          traceId: 'test-trace-id',
        },
        HttpStatus.BAD_REQUEST,
      );
    });

    it('should handle non-HttpExceptions as internal server errors', () => {
      const mockException = new Error('Unexpected error');

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          message: 'Unexpected error',
          traceId: 'test-trace-id',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });

    it('should handle exceptions without traceId', () => {
      mockRequest.traceId = undefined;
      const mockException = new NotFoundException('Resource not found');

      filter.catch(mockException, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          traceId: undefined,
        }),
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
