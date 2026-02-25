# Order Service

Demo microservice that demonstrates consuming the Config Service via gRPC.

## Overview

The Order Service is a sample microservice that:

- **Consumes configurations** from the Config Service via gRPC
- **Demonstrates multi-tenant architecture** with JWT-based tenant isolation
- **Uses tenant-specific configurations** for payment gateways and validation rules
- **Loads configurations on startup** and caches them in memory
- **Provides REST API endpoints** for order management

## Architecture

```
Order Service
    ↓ (gRPC via Cloud Map Service Discovery)
Config Service (DNS: config-service.config-service-{env}.local:5000)
    ↓
DynamoDB / SSM Parameter Store
```

The Order Service uses **AWS Cloud Map** for service discovery to dynamically resolve the Config Service endpoint. This eliminates the need for hardcoded ALB DNS names and enables automatic service discovery within the VPC.

## Features

### Configuration Integration

- **Startup Configuration Loading**: Fetches critical configs on service startup
- **gRPC Communication**: Uses gRPC for high-performance config retrieval
- **In-Memory Caching**: Caches configurations for fast access
- **Multi-Tenant Support**: Each tenant gets their own configurations

### Business Logic

- **Order Creation**: Creates orders using payment gateway from config
- **Order Validation**: Validates order amounts using min/max rules from config
- **Order Management**: List and retrieve orders per tenant

## API Endpoints

### Health Check

```
GET /api/v1/health
Response: { "status": "ok", "timestamp": "...", "service": "order-service" }
```

### Orders

```
POST /api/v1/orders
Headers: Authorization: Bearer <JWT>
Body: {
  "productId": "string",
  "quantity": number,
  "amount": number,
  "currency": "string"
}

GET /api/v1/orders
Headers: Authorization: Bearer <JWT>

GET /api/v1/orders/:id
Headers: Authorization: Bearer <JWT>
```

## Configuration Keys Used

The service fetches these configurations from Config Service:

- `tenant_config_payment-gateway`: Payment gateway settings per tenant
- `tenant_config_validations`: Validation rules (min amounts, etc.)

## Environment Variables

```bash
NODE_ENV=dev
PORT=3001
CONFIG_SERVICE_ENDPOINT=config-service-dev-alb:5000
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
LOG_LEVEL=info
```

## Running Locally

```bash
# Install dependencies
cd apps/order-service
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run in development mode
npm run start:dev
```

## Docker Build

```bash
# Build image
docker build -f apps/order-service/Dockerfile -t order-service:latest .

# Run container (single line)
docker run -p 3001:3001 -e CONFIG_SERVICE_ENDPOINT=config-service.config-service-dev.local:5000 -e COGNITO_USER_POOL_ID=us-east-1_UK7anuIrt -e COGNITO_CLIENT_ID=48gb3hlodolfceds56hcgjus8s -e NODE_ENV=dev -e PORT=3001 order-service:latest

# Or with multi-line (use backslashes properly)
docker run -p 3001:3001 \
  -e CONFIG_SERVICE_ENDPOINT=config-service.config-service-dev.local:5000 \
  -e COGNITO_USER_POOL_ID=us-east-1_UK7anuIrt \
  -e COGNITO_CLIENT_ID=48gb3hlodolfceds56hcgjus8s \
  -e NODE_ENV=dev \
  -e PORT=3001 \
  order-service:latest

# Test the health endpoint
curl http://localhost:3001/api/v1/health
```

**Note**: The health endpoint is at `/api/v1/health`, not `/health`.

## Deployment

The service is deployed to AWS ECS Fargate with:

- Private subnets (no public access)
- Security groups allowing gRPC traffic to Config Service
- CloudWatch logging
- Health checks via ALB

## Multi-Tenant Flow

1. **Client authenticates** with Cognito → receives JWT with `custom:tenantId`
2. **Client makes request** to Order Service with JWT in Authorization header
3. **Order Service validates JWT** and extracts `tenantId`
4. **Order Service calls Config Service** via gRPC with tenant context
5. **Config Service returns** tenant-specific configurations
6. **Order Service processes request** using tenant's configurations

## Example Usage

### Create Order (with Tenant A's payment gateway)

```bash
# Get JWT token for Tenant A
TOKEN=$(curl -X POST https://cognito-endpoint/oauth2/token ...)

# Create order
curl -X POST http://order-service/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-123",
    "quantity": 2,
    "amount": 50.00,
    "currency": "USD"
  }'

# Response includes payment gateway from Tenant A's config
{
  "orderId": "uuid",
  "tenantId": "tenant-a",
  "productId": "prod-123",
  "quantity": 2,
  "amount": 50.00,
  "currency": "USD",
  "status": "pending",
  "paymentGateway": "Stripe",  # From Tenant A's config
  "createdAt": "2024-01-19T..."
}
```

## Development Notes

### gRPC Client

The service uses `@nestjs/microservices` with gRPC transport to communicate with Config Service. The client is configured in `ConfigClientModule` and injected into services.

### Error Handling

- Configuration load failures log warnings but don't prevent startup
- Failed config fetches throw exceptions and return error responses
- All errors are handled by shared exception filters

### Logging

Uses shared Winston logger with structured JSON logging for CloudWatch integration.

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

