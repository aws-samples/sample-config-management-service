// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { lastValueFrom, Observable } from 'rxjs';

interface RetrieveConfigResponse {
  data: any;
}

interface RetrieveConfigsResponse {
  data: Record<string, any>;
}

interface ConfigService {
  retrieveConfig(
    data: { serviceName: string; key: string },
    metadata?: Metadata,
  ): Observable<RetrieveConfigResponse>;
  retrieveConfigs(
    data: { keys: string[] },
    metadata?: Metadata,
  ): Observable<RetrieveConfigsResponse>;
}

@Injectable()
export class ConfigClientService implements OnModuleInit {
  private readonly logger = new Logger(ConfigClientService.name);

  private configService: ConfigService;

  private configCache: Map<string, any> = new Map();

  constructor(@Inject('CONFIG_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.configService = this.client.getService<ConfigService>('ConfigService');
  }

  /**
   * Create gRPC metadata with JWT authorization header
   * @param token - JWT token (with or without 'Bearer ' prefix)
   * @returns gRPC Metadata object
   */
  private createAuthMetadata(token: string): Metadata {
    const metadata = new Metadata();
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    metadata.add('authorization', bearerToken);
    return metadata;
  }

  /**
   * Fetch configuration from config service via gRPC
   * @param serviceName - Name of the service requesting config
   * @param key - Configuration key (e.g., 'tenant_config_payment-gateway')
   * @param token - JWT token for authentication
   * @returns Configuration data
   */
  async fetchConfig(serviceName: string, key: string, token: string): Promise<any> {
    try {
      this.logger.log(`Fetching config: serviceName=${serviceName}, key=${key}`);

      const metadata = this.createAuthMetadata(token);

      const response = await lastValueFrom(
        this.configService.retrieveConfig(
          {
            serviceName,
            key,
          },
          metadata,
        ),
      );

      this.logger.log(`Config fetched successfully for key: ${key}`);

      // Cache the configuration
      this.configCache.set(key, response.data);

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch config for key ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch multiple configurations in a single call
   * @param keys - Array of configuration keys
   * @param token - JWT token for authentication
   * @returns Map of configuration data
   */
  async fetchConfigs(keys: string[], token: string): Promise<Record<string, any>> {
    try {
      this.logger.log(`Fetching multiple configs: ${keys.join(', ')}`);

      const metadata = this.createAuthMetadata(token);

      const response = await lastValueFrom(this.configService.retrieveConfigs({ keys }, metadata));

      this.logger.log(`Configs fetched successfully`);

      // Cache all configurations
      Object.entries(response.data).forEach(([key, value]) => {
        this.configCache.set(key, value);
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch configs:`, error.message);
      throw error;
    }
  }

  /**
   * Get configuration from cache
   * @param key - Configuration key
   * @returns Cached configuration or null
   */
  getCachedConfig(key: string): any {
    return this.configCache.get(key);
  }
}
