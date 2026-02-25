// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.
// Copyright 2024 Amazon.com and its affiliates; all rights reserved.
// This file is Amazon Web Services Content and may not be duplicated
// or distributed without permission.

import {
  GetParametersByPathCommand,
  GetParametersByPathCommandOutput,
  SSMClient,
} from '@aws-sdk/client-ssm';
import { Injectable, Logger } from '@nestjs/common';
import { Span } from 'nestjs-otel';

import { CustomHttpException } from '@shared/filters';

@Injectable()
export class SsmService {
  constructor(
    private readonly logger: Logger,
    private ssmClient: SSMClient,
  ) {
    this.ssmClient = new SSMClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  @Span('get-parameters-by-path-from-ssm')
  async getParameter(secretName: string) {
    let nextToken = '';
    let parameters: Array<GetParametersByPathCommandOutput> = [];

    do {
      const getParametersByPathCommand = new GetParametersByPathCommand({
        Path: secretName,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      });

      let response: GetParametersByPathCommandOutput;
      try {
        response = await this.ssmClient.send(getParametersByPathCommand);
      } catch (error) {
        this.logger.error(error);
        throw CustomHttpException.INTERNAL_SERVER_ERROR('Error Fetching parameters from AWS SSM');
      }

      // Handle empty parameters gracefully - it's valid for SSM path to have no parameters
      if (!response.Parameters || response.Parameters.length === 0) {
        this.logger.warn(`No parameters found at path: ${secretName}`);
        break; // Exit the loop if no parameters found
      }

      parameters = parameters.concat(response);
      if (!response.NextToken) {
        break;
      }
      nextToken = response.NextToken;
    } while (nextToken);

    this.logger.log(`Secret found for ${secretName}`);

    return parameters;
  }
}
