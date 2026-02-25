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
import { ValidationError } from 'class-validator';

import { BadRequestException, BadRequestExceptionFilter } from '@shared/filters';
import { MockHttpAdapter } from '../mocks/http-adapter.mock';
import { MockBaseLogger } from '../mocks/logger.mock';

describe('BadRequestExceptionFilter', () => {
  let module: TestingModule;
  let filter: BadRequestExceptionFilter;
  let httpAdapterHost: HttpAdapterHost;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [BadRequestExceptionFilter, MockHttpAdapter],
    }).compile();

    filter = module.get<BadRequestExceptionFilter>(BadRequestExceptionFilter);
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
    let mockException: BadRequestException;
    let mockHost: ArgumentsHost;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockException = new BadRequestException({
        message: 'Test error',
        code: 400,
        description: 'A bad request occurred',
        traceId: undefined,
      });
      mockException.getStatus = jest.fn().mockReturnValue(400);
      mockException.getResponse = jest.fn().mockReturnValue({ message: 'Test error' });
      mockException.setTraceId = jest.fn();
      mockException.generateHttpResponseBody = jest.fn().mockReturnValue({ error: 'Test error' });

      mockRequest = { traceId: 'test-trace-id' };
      mockResponse = {};
      mockHost = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ArgumentsHost;
    });

    it('should handle BadRequestException with a single message', () => {
      filter.catch(mockException, mockHost);

      expect(mockException.setTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockException.generateHttpResponseBody).toHaveBeenCalledWith(['Test error']);
      expect(httpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockResponse,
        { error: 'Test error' },
        400,
      );
    });

    it('should handle BadRequestException with multiple validation errors', () => {
      const validationErrors = [
        { property: 'username', constraints: { isNotEmpty: 'Username should not be empty' } },
        { property: 'email', constraints: { isEmail: 'Email should be valid' } },
      ];
      mockException.getResponse = jest.fn().mockReturnValue({ message: validationErrors });

      filter.catch(mockException, mockHost);

      expect(mockException.generateHttpResponseBody).toHaveBeenCalledWith([
        'Username should not be empty',
        'Email should be valid',
      ]);
    });
  });

  describe('flatterValidationErrors', () => {
    it('should flatten simple validation errors', () => {
      const errors: ValidationError[] = [
        { property: 'username', constraints: { isNotEmpty: 'Username should not be empty' } },
        { property: 'email', constraints: { isEmail: 'Email should be valid' } },
      ];

      const result = (filter as any).flatterValidationErrors(errors);
      expect(result).toEqual(['Username should not be empty', 'Email should be valid']);
    });

    it('should flatten nested validation errors', () => {
      const errors: ValidationError[] = [
        {
          property: 'user',
          children: [
            { property: 'name', constraints: { isNotEmpty: 'Name should not be empty' } },
            { property: 'age', constraints: { isNumber: 'Age should be a number' } },
          ],
        },
      ];

      const result = (filter as any).flatterValidationErrors(errors);
      expect(result).toEqual(['Name should not be empty', 'Age should be a number']);
    });

    it('should return an empty array for non-array input', () => {
      const result = (filter as any).flatterValidationErrors('not an array');
      expect(result).toEqual([]);
    });
  });
});
