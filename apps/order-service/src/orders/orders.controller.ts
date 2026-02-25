// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

import { Controller, Get, Post, Body, Param, Logger, Headers } from '@nestjs/common';
import { CurrentTenant } from '@shared/auth';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './interfaces/order.interface';

@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Headers('authorization') authHeader: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    this.logger.log(`Creating order for tenant: ${tenantId}`);
    return this.ordersService.create(tenantId, authHeader, createOrderDto);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Headers('authorization') authHeader: string,
  ): Promise<Order[]> {
    this.logger.log(`Fetching all orders for tenant: ${tenantId}`);
    return this.ordersService.findAll(tenantId, authHeader);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenantId: string,
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ): Promise<Order> {
    this.logger.log(`Fetching order ${id} for tenant: ${tenantId}`);
    return this.ordersService.findOne(tenantId, authHeader, id);
  }
}
