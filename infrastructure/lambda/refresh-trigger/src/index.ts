// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import * as grpc from '@grpc/grpc-js';
import { promises as dns } from 'dns';
import type { EventBridgeEvent } from 'aws-lambda';

/**
 * Event detail shape for SSM Parameter Store changes
 */
interface SSMChangeDetail {
  name?: string;
  operation?: string;
  requestParameters?: {
    name?: string;
  };
  eventName?: string;
}

/**
 * Result of a gRPC refresh call to a single config-service instance
 */
interface RefreshResult {
  host: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Create a gRPC client for ConfigService.refreshConfig using makeGenericClientConstructor.
 * This avoids needing a .proto file — the refreshConfig RPC is simple: Empty {} → Empty {}
 *
 * The gRPC path follows the convention: /package.ServiceName/MethodName
 * which maps to: /configuration.ConfigService/refreshConfig
 */
function createConfigServiceClient(targetHost: string): grpc.Client & {
  refreshConfig: (
    request: Record<string, never>,
    metadata: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: Record<string, unknown>) => void,
  ) => void;
} {
  const serviceDef: grpc.ServiceDefinition = {
    refreshConfig: {
      path: '/configuration.ConfigService/refreshConfig',
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: Record<string, never>): Buffer => {
        // Empty protobuf message serializes to empty buffer
        void value;
        return Buffer.alloc(0);
      },
      requestDeserialize: (_buffer: Buffer): Record<string, never> => {
        return {};
      },
      responseSerialize: (value: Record<string, unknown>): Buffer => {
        void value;
        return Buffer.alloc(0);
      },
      responseDeserialize: (_buffer: Buffer): Record<string, unknown> => {
        return {};
      },
    },
  };

  const ConfigServiceClient = grpc.makeGenericClientConstructor(serviceDef, 'ConfigService', {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ConfigServiceClient(targetHost, grpc.credentials.createInsecure()) as any;
}

/**
 * Make a single gRPC refreshConfig call to a target host
 */
function callGrpcRefresh(targetHost: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const client = createConfigServiceClient(targetHost);

    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 10);

    client.refreshConfig({}, { deadline: deadline.getTime() }, (error, response) => {
      client.close();
      if (error) {
        reject(error);
      } else {
        resolve(response || {});
      }
    });
  });
}

/**
 * Resolve service discovery DNS and call refreshConfig on all config-service instances
 */
async function callRefreshConfig(): Promise<RefreshResult[]> {
  const serviceEndpoint = process.env.SERVICE_DISCOVERY_ENDPOINT;

  if (!serviceEndpoint) {
    throw new Error('SERVICE_DISCOVERY_ENDPOINT environment variable not set');
  }

  console.log(`Using service discovery endpoint: ${serviceEndpoint}`);

  // Service endpoint format: config-service.config-service-dev.local:5000
  const [hostname, port] = serviceEndpoint.split(':');

  // Resolve DNS via Cloud Map (automatic in VPC)
  console.log(`Resolving ${hostname} via Cloud Map DNS...`);
  const addresses = await dns.resolve4(hostname);
  console.log(`Resolved to IP addresses: ${addresses.join(', ')}`);

  // Call each resolved IP (handles multiple ECS tasks registered in Cloud Map)
  const results: RefreshResult[] = [];

  for (const ip of addresses) {
    const targetHost = `${ip}:${port}`;
    console.log(`Calling gRPC refreshConfig on ${targetHost}`);

    try {
      const result = await callGrpcRefresh(targetHost);
      console.log('gRPC call successful:', { targetHost, result: JSON.stringify(result) });
      results.push({ host: targetHost, status: 'success' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('gRPC call failed:', { targetHost, error: errorMessage });
      results.push({ host: targetHost, status: 'failed', error: errorMessage });
    }
  }

  console.log('Refresh results:', JSON.stringify(results));

  // Throw if ALL calls failed
  if (results.length > 0 && results.every((r) => r.status === 'failed')) {
    throw new Error(`All gRPC refresh calls failed: ${JSON.stringify(results)}`);
  }

  return results;
}

/**
 * Lambda handler triggered by EventBridge when SSM or Secrets Manager parameters change.
 * Calls the config service's refreshConfig gRPC endpoint to reload in-memory cache.
 */
export const handler = async (
  event: EventBridgeEvent<
    'Parameter Store Change' | 'AWS API Call via CloudTrail',
    SSMChangeDetail
  >,
): Promise<{
  statusCode: number;
  message: string;
  tenantId?: string;
  operation?: string;
  results?: RefreshResult[];
}> => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Extract parameter name from event
  const parameterName = event.detail.name || event.detail.requestParameters?.name;

  if (!parameterName) {
    console.log('No parameter name found in event');
    return { statusCode: 400, message: 'Invalid event structure' };
  }

  console.log(`Parameter changed: ${parameterName}`);

  // Extract tenant ID from parameter path
  // Example: /config-service/acme-corp/api/key -> acme-corp
  const match = parameterName.match(/^\/config-service\/([^/]+)/);

  if (!match) {
    console.log('Not a config-service parameter, ignoring');
    return { statusCode: 200, message: 'Not applicable - parameter outside scope' };
  }

  const tenantId = match[1];
  const operation = event.detail.operation || event.detail.eventName;

  console.log(`Tenant: ${tenantId}, Operation: ${operation}`);
  console.log('Triggering config refresh...');

  try {
    const results = await callRefreshConfig();
    console.log('Config refresh triggered successfully');
    return {
      statusCode: 200,
      message: 'Success',
      tenantId,
      operation,
      results,
    };
  } catch (error) {
    console.error('Failed to trigger config refresh:', error);
    throw error;
  }
};
