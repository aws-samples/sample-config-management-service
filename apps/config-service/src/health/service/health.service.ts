// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Injectable, Logger } from '@nestjs/common';
import { Span } from 'nestjs-otel';

@Injectable()
export class HealthService {
  constructor(private readonly logger: Logger) {}

  @Span('getHealth')
  getHealth(): string {
    this.logger.log('Retrieving service health', HealthService.name);
    return 'Healthy';
  }
}
