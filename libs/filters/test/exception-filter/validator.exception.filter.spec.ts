// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ValidationError } from 'class-validator';

import { BadRequestException, ValidationExceptionFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('ValidationExceptionFilter', () => {
  let module: TestingModule;
  let filter: ValidationExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ValidationExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<ValidationExceptionFilter>(ValidationExceptionFilter);
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
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ArgumentsHost;

      BadRequestException.VALIDATION_ERROR = jest.fn().mockImplementation((message) => ({
        message,
        code: 'VALIDATION_ERROR',
      }));
    });

    it('should handle ValidationError with constraints correctly', () => {
      const mockValidationError = new ValidationError();
      mockValidationError.constraints = { isString: 'must be a string' };

      filter.catch(mockValidationError, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockValidationError);
      expect(BadRequestException.VALIDATION_ERROR).toHaveBeenCalledWith('must be a string');
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          error: 'VALIDATION_ERROR',
          message: 'must be a string',
          traceId: 'test-trace-id',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });

    it('should handle ValidationError with children correctly', () => {
      const mockValidationError = new ValidationError();
      mockValidationError.children = [
        {
          constraints: { isNumber: 'must be a number' },
          property: 'property',
          value: 'value',
        },
      ];

      filter.catch(mockValidationError, mockHost);

      expect(Logger.prototype.error).toHaveBeenCalledWith(mockValidationError);
      expect(BadRequestException.VALIDATION_ERROR).toHaveBeenCalledWith('must be a number');
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        {
          error: 'VALIDATION_ERROR',
          message: 'must be a number',
          traceId: 'test-trace-id',
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });

    it('should handle exceptions without traceId', () => {
      mockRequest.traceId = undefined;
      const mockValidationError = new ValidationError();
      mockValidationError.constraints = { isString: 'must be a string' };

      filter.catch(mockValidationError, mockHost);

      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        expect.objectContaining({
          traceId: undefined,
        }),
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });
  });
});
