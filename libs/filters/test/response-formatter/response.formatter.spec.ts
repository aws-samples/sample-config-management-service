// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { ResponseFormatterInterceptor } from '@shared/filters';

describe('ResponseFormatterInterceptor', () => {
  let interceptor: ResponseFormatterInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    mockCallHandler = { handle: jest.fn() } as any;
    mockExecutionContext = {} as ExecutionContext;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseFormatterInterceptor],
    }).compile();

    interceptor = module.get<ResponseFormatterInterceptor>(ResponseFormatterInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should return data as-is if it already has status and data properties', (done) => {
    const responseData = { status: 'success', data: [{ id: 1 }] };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual(responseData);
        done();
      },
    });
  });

  it('should format response with custom message if provided', (done) => {
    const responseData = { message: 'Custom message', payload: { id: 1 } };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          status: 'success',
          data: [{ id: 1 }],
          message: 'Custom message',
        });
        done();
      },
    });
  });

  it('should format response with default message if no message provided', (done) => {
    const responseData = { payload: { id: 1 } };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          status: 'success',
          data: [{ id: 1 }],
          message: 'Request processed successfully',
        });
        done();
      },
    });
  });

  it('should wrap non-array payload in an array', (done) => {
    const responseData = { payload: { id: 1 } };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data).toEqual([{ id: 1 }]);
        done();
      },
    });
  });

  it('should keep array payload as-is', (done) => {
    const responseData = { payload: [{ id: 1 }, { id: 2 }] };
    mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.data).toBeInstanceOf(Array);
        expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
        done();
      },
    });
  });
});
