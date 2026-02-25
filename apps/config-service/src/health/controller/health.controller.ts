// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { ApiOkResponse } from '@nestjs/swagger';
import { Controller, Get, Logger } from '@nestjs/common';

import { HealthService } from '../service/health.service';

@Controller('config')
export class HealthController {
  constructor(
    private readonly logger: Logger,
    private readonly healthService: HealthService,
  ) {}

  @Get('/health')
  @ApiOkResponse({ description: 'Healthy' })
  getHealth(): string {
    this.logger.log('HealthController invoking HealthService', HealthController.name);
    return this.healthService.getHealth();
  }
}
