// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { Logger, Module } from '@nestjs/common';

import { HealthController } from './controller/health.controller';
import { HealthService } from './service/health.service';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [HealthService, Logger],
})
export class HealthModule {}
