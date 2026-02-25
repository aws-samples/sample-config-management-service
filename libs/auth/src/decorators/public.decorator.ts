// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * Decorator to mark routes/handlers as public (no authentication required)
 *
 * @example
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   @Public()
 *   @Get()
 *   healthCheck() {
 *     return { status: 'ok' };
 *   }
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
