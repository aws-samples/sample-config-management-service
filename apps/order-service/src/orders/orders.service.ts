// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigClientService } from '../config/config-client.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './interfaces/order.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private orders: Order[] = []; // In-memory store for demo

  constructor(private readonly configClient: ConfigClientService) {}

  /**
   * Ensure required configurations are loaded, fetching via gRPC if cache is empty.
   * Fetches both tenant_config_ (tenant-scoped) and param_config_ (parameter-scoped) keys.
   * @param token - JWT token for authenticating gRPC calls to config service
   */
  private async ensureConfigsLoaded(token: string): Promise<void> {
    const paymentConfig = this.configClient.getCachedConfig('tenant_config_payment-gateway');
    const apiSettingsConfig = this.configClient.getCachedConfig('tenant_config_api-settings');
    const apiKeyParamConfig = this.configClient.getCachedConfig('param_config_api-key');

    // Fetch each tenant_config_ key individually since retrieveConfigs
    // only supports param_config_ prefix for batch calls
    if (!paymentConfig) {
      this.logger.log('Cache miss — fetching payment-gateway config via gRPC');
      try {
        await this.configClient.fetchConfig(
          'order-service',
          'tenant_config_payment-gateway',
          token,
        );
      } catch (error) {
        this.logger.warn(`Could not fetch payment-gateway config: ${error.message}`);
      }
    }

    if (!apiSettingsConfig) {
      this.logger.log('Cache miss — fetching api-settings config via gRPC');
      try {
        await this.configClient.fetchConfig('order-service', 'tenant_config_api-settings', token);
      } catch (error) {
        this.logger.warn(`Could not fetch api-settings config: ${error.message}`);
      }
    }

    // Fetch param_config_ keys (parameter-scoped configuration from SSM)
    if (!apiKeyParamConfig) {
      this.logger.log('Cache miss — fetching api-key param config via gRPC');
      try {
        await this.configClient.fetchConfig('api', 'param_config_api-key', token);
      } catch (error) {
        this.logger.warn(`Could not fetch api-key param config: ${error.message}`);
      }
    }
  }

  /**
   * Create a new order using payment gateway configuration from config service
   */
  async create(tenantId: string, token: string, createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(`Creating order for tenant: ${tenantId}`);

    // Ensure configs are loaded (fetch via gRPC if not cached)
    await this.ensureConfigsLoaded(token);

    // Validate amount using configuration
    await this.validateOrder(createOrderDto);

    // Get payment gateway configuration
    const paymentConfig = this.configClient.getCachedConfig('tenant_config_payment-gateway');

    // Get API key from param_config (fetched from SSM Parameter Store)
    // paramMapper stores the last segment of the SSM path as the key name
    // e.g. /config-service/acme-corp/dev/api/api-key → key = "api-key"
    const apiKeyConfig = this.configClient.getCachedConfig('param_config_api-key');
    const apiKey = apiKeyConfig?.parameters?.find(
      (p: { key: string }) => p.key === 'api-key',
    )?.value;

    if (apiKey) {
      this.logger.log('API key param config loaded successfully');
    }

    const order: Order = {
      orderId: uuidv4(),
      tenantId,
      ...createOrderDto,
      status: 'pending',
      paymentGateway: paymentConfig?.tenant?.config?.[0]?.paymentGateway?.[0]?.name || 'default',
      createdAt: new Date().toISOString(),
    };

    this.orders.push(order);

    this.logger.log(`Order created: ${order.orderId} using ${order.paymentGateway}`);

    return order;
  }

  /**
   * Get all orders for a tenant
   */
  async findAll(tenantId: string, token: string): Promise<Order[]> {
    this.logger.log(`Fetching orders for tenant: ${tenantId}`);

    // Ensure configs are loaded for any config-dependent logic
    await this.ensureConfigsLoaded(token);

    return this.orders.filter((order) => order.tenantId === tenantId);
  }

  /**
   * Get a specific order by ID
   */
  async findOne(tenantId: string, token: string, orderId: string): Promise<Order> {
    this.logger.log(`Fetching order: ${orderId} for tenant: ${tenantId}`);

    // Ensure configs are loaded for any config-dependent logic
    await this.ensureConfigsLoaded(token);

    const order = this.orders.find((o) => o.orderId === orderId && o.tenantId === tenantId);

    if (!order) {
      throw new BadRequestException(`Order not found: ${orderId}`);
    }

    return order;
  }

  /**
   * Validate order using validation rules from config service
   */
  private async validateOrder(dto: CreateOrderDto): Promise<void> {
    // Validation rules are embedded in the payment-gateway config from DynamoDB
    const paymentConfig = this.configClient.getCachedConfig('tenant_config_payment-gateway');

    if (paymentConfig?.tenant?.config?.[0]?.validations) {
      const minAmount = parseFloat(
        paymentConfig.tenant.config[0].validations[0]?.minSIPAmount || '0',
      );

      if (dto.amount < minAmount) {
        throw new BadRequestException(
          `Order amount ${dto.amount} is below minimum allowed: ${minAmount}`,
        );
      }
    }
  }
}
