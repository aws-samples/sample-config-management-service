// © 2024 Amazon Web Services, Inc. or its affiliates.
// All Rights Reserved. This AWS Content is provided subject to the terms of
// the AWS Customer Agreement available at <http://aws.amazon.com/agreement>
// or other written agreement between Customer and either
// Amazon Web Services, Inc. or Amazon Web Service EMEA SARL or both.

export interface Order {
  orderId: string;
  tenantId: string;
  productId: string;
  quantity: number;
  amount: number;
  currency: string;
  status: string;
  paymentGateway?: string;
  createdAt: string;
}
