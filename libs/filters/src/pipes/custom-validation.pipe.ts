// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';

import { BadRequestException } from '../exceptions';

@Injectable()
export class CustomValidationPipe extends ValidationPipe implements PipeTransform {
  public transform(value: any, metadata: ArgumentMetadata) {
    try {
      return super.transform(value, metadata);
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      if (e instanceof Error) {
        throw new BadRequestException({
          code: 400,
          message: [e.message],
          description: 'Validation error occurred',
        });
      }
    }
  }

  constructor(options?: ValidationPipeOptions) {
    super({
      transform: true,
      disableErrorMessages: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const errorMessages = this.flatterValidationErrors(errors);
        return new BadRequestException({
          code: 400,
          message: errorMessages,
          description: 'Bad Request Parameters',
        });
      },
      ...options,
    });
  }

  flatterValidationErrors(errors: ValidationError[]): string[] {
    const result: string[] = [];

    const processError = (errors: ValidationError[]) => {
      errors.forEach((err) => {
        if (err.children && err.children.length > 0) {
          processError(err.children);
        }
        if (err.constraints) {
          result.push(...Object.values(err.constraints));
        }
      });
    };
    processError(errors);
    return result;
  }
}
