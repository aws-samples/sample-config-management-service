# Testing Guide

Complete guide for testing the Multi-Tenant Configuration Service locally and after cloud deployment.

---

## Table of Contents

- [Local Testing](#local-testing)
- [Testing After Cloud Deployment](#testing-after-cloud-deployment)

---

## Local Testing

### Prerequisites

Before testing locally, ensure you have:

**Required Tools:**

- **grpcurl** for testing gRPC endpoints: `brew install grpcurl`
- **jq** for JSON processing: `brew install jq`
- **AWS CLI** configured with credentials

**Environment Setup:**

1. **Configure Config Service environment variables:**

```bash
cp .env.example .env
```

Edit `.env` in project root with your AWS resources:

```env
DYNAMO_CONFIG_TABLE=config-service-dev-configurations
SSM_PATH=/config-service
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
GRPC_PORT=5000
NODE_ENV=dev
```

2. **Configure Order Service environment variables:**

```bash
cp apps/order-service/.env.example apps/order-service/.env
```

Edit `apps/order-service/.env` with your configuration:

```env
CONFIG_SERVICE_ENDPOINT=localhost:5000
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
LOG_LEVEL=info
PORT=3001
NODE_ENV=dev
```

3. **Seed test data:**

```bash
export COGNITO_USER_POOL_ID=<your-user-pool-id>
export AWS_REGION=us-east-1
export ENVIRONMENT=dev

npx ts-node ../scripts/seed-tenants.ts
```

This creates:

- **Acme Corp**: `user@acme-corp.com` / `AcmeUser@2024`
- **Globex Inc**: `user@globex-inc.com` / `GlobexUser@2024`
- DynamoDB configurations
- SSM parameters

---

### Install Dependencies

Before starting services, install all dependencies:

```bash
# Install root dependencies
npm install

# Install library dependencies
npm run install:libs

# Install service dependencies
npm run install:config-service
npm run install:order-service
```

---

### Start Services

#### Terminal 1: Config Service

```bash
npm run start:config-service
# Starts on port 3000 (HTTP), port 5000 (gRPC)
```

#### Terminal 2: Order Service

```bash
npm run start:order-service
# Starts on port 3001 (REST)
```

---

### Test Config Service (gRPC)

#### 1. Health Check (No Authentication)

```bash
grpcurl \
  -plaintext \
  -import-path libs/proto/src/config-service \
  -proto configuration.proto \
  localhost:5000 \
  configuration.ConfigService/healthCheck
```

**Expected Response:**

```json
{
  "data": "Healthy"
}
```

#### 2. Get JWT Token

```bash
# Set environment variables
export COGNITO_USER_POOL_ID="<from-cloudformation-output>"
export COGNITO_CLIENT_ID="<from-cloudformation-output>"
export AWS_REGION="us-east-1"
```

**Acme Corp User:**

```bash
export ACME_TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $COGNITO_CLIENT_ID \
  --auth-parameters USERNAME=user@acme-corp.com,PASSWORD=AcmeUser@2024 \
  --region $AWS_REGION \
  --query 'AuthenticationResult.IdToken' \
  --output text)

echo "Token length: ${#ACME_TOKEN}"
```

**Globex Inc User:**

```bash
export GLOBEX_TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $COGNITO_CLIENT_ID \
  --auth-parameters USERNAME=user@globex-inc.com,PASSWORD=GlobexUser@2024 \
  --region $AWS_REGION \
  --query 'AuthenticationResult.IdToken' \
  --output text)

echo "Token length: ${#GLOBEX_TOKEN}"
```

#### 3. Retrieve Configuration (Tenant-Specific)

**Acme Corp - Payment Gateway:**

```bash
grpcurl \
  -plaintext \
  -H "authorization: Bearer $ACME_TOKEN" \
  -import-path libs/proto/src/config-service \
  -proto configuration.proto \
  -d '{"serviceName": "api", "key": "tenant_config_payment-gateway"}' \
  localhost:5000 \
  configuration.ConfigService/retrieveConfig
```

**Expected Response:**

```json
{
  "data": {
    "tenant": {
      "pk": "TENANT#acme-corp",
      "sk": "CONFIG#payment-gateway",
      "config": [
        {
          "amcCode": "ACME001",
          "paymentGateway": [{ "name": "Stripe", "link": "https://stripe.com/acme" }]
        }
      ]
    }
  }
}
```

**Globex Inc - Payment Gateway:**

```bash
grpcurl \
  -plaintext \
  -H "authorization: Bearer $GLOBEX_TOKEN" \
  -import-path libs/proto/src/config-service \
  -proto configuration.proto \
  -d '{"serviceName": "api", "key": "tenant_config_payment-gateway"}' \
  localhost:5000 \
  configuration.ConfigService/retrieveConfig
```

**Expected Response:**

```json
{
  "data": {
    "tenant": {
      "pk": "TENANT#globex-inc",
      "sk": "CONFIG#payment-gateway",
      "config": [
        {
          "amcCode": "GLOB001",
          "paymentGateway": [{ "name": "PayPal", "link": "https://paypal.com/globex" }]
        }
      ]
    }
  }
}
```

#### 4. Retrieve Multiple SSM Parameters

```bash
grpcurl \
  -plaintext \
  -H "authorization: Bearer $ACME_TOKEN" \
  -import-path libs/proto/src/config-service \
  -proto configuration.proto \
  -d '{"keys": ["param_config_api/api-key", "param_config_api/endpoint"]}' \
  localhost:5000 \
  configuration.ConfigService/retrieveConfigs
```

**Expected Response:**

```json
{
  "data": {
    "/config-service/acme-corp/dev/api/api-key": "acme-secret-key-123-demo",
    "/config-service/acme-corp/dev/api/endpoint": "https://api.acme-corp.com/v1"
  }
}
```

---

### Test Order Service (REST)

#### 1. Health Check

```bash
curl http://localhost:3001/api/v1/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-02-15T...",
  "service": "order-service"
}
```

#### 2. Create Order (Triggers Config Service Call)

```bash
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $ACME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod-123",
    "quantity": 2,
    "amount": 600.00,
    "currency": "USD"
  }' | jq .
```

**Expected Response:**

```json
{
  "orderId": "uuid-here",
  "tenantId": "acme-corp",
  "productId": "test-prod-123",
  "quantity": 2,
  "amount": 600.0,
  "currency": "USD",
  "status": "pending",
  "paymentGateway": "Stripe",
  "createdAt": "2024-02-15T..."
}
```

**✅ Key Verification:** `paymentGateway: "Stripe"` proves order-service called config-service via gRPC!

#### 3. Test Validation Rules

Try creating an order below minimum amount (Acme min is $500):

```bash
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $ACME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod-456",
    "quantity": 1,
    "amount": 100.00,
    "currency": "USD"
  }' | jq .
```

**Expected Response:** 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Order amount 100 is below minimum allowed: 500",
  "error": "Bad Request"
}
```

#### 4. List Orders

```bash
curl http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $ACME_TOKEN" | jq .
```

#### 5. Get Specific Order

```bash
curl http://localhost:3001/api/v1/orders/<order-id> \
  -H "Authorization: Bearer $ACME_TOKEN" | jq .
```

---

### Test Multi-Tenant Isolation

#### Acme Corp Orders

```bash
# Create Acme order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $ACME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "acme-prod-1",
    "quantity": 1,
    "amount": 750.00,
    "currency": "USD"
  }' | jq .

# List Acme orders (should see only Acme orders)
curl http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $ACME_TOKEN" | jq .
```

#### Globex Inc Orders

```bash
# Create Globex order
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $GLOBEX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "globex-prod-1",
    "quantity": 1,
    "amount": 300.00,
    "currency": "USD"
  }' | jq .

# List Globex orders (should see only Globex orders)
curl http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $GLOBEX_TOKEN" | jq .
```

**✅ Verification:**

- Acme sees `paymentGateway: "Stripe"` and only Acme orders
- Globex sees `paymentGateway: "PayPal"` and only Globex orders
- Complete tenant isolation!

---

### Automated Testing Script

For convenience, use the automated test script:

```bash
cd infrastructure/testing
./test-local.sh
```

This script automatically:

- ✅ Loads .env from project root
- ✅ Checks prerequisites
- ✅ Tests health check endpoints (gRPC + REST)
- ✅ Gets JWT tokens for both tenants
- ✅ Tests retrieveConfig for each tenant
- ✅ Tests retrieveConfigs for each tenant
- ✅ Verifies tenant isolation on orders

---

## Testing After Cloud Deployment

### Prerequisites

Ensure you have deployed all CloudFormation stacks (see [infrastructure/README.md](../infrastructure/README.md)).

---

### Get API Gateway Endpoint

```bash
export API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name config-service-app \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' \
  --output text)

echo "API Endpoint: $API_ENDPOINT"
```

---

### Get JWT Token

```bash
# Get Cognito details from CloudFormation
export COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name config-service-data \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text)

export COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name config-service-data \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' \
  --output text)

export AWS_REGION="us-east-1"

# Get token for Acme
export TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $COGNITO_CLIENT_ID \
  --auth-parameters USERNAME=user@acme-corp.com,PASSWORD=AcmeUser@2024 \
  --region $AWS_REGION \
  --query 'AuthenticationResult.IdToken' \
  --output text)

echo "Token length: ${#TOKEN}"
```

---

### Test 1: Health Check (No Authentication)

```bash
curl ${API_ENDPOINT}/api/v1/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-02-15T...",
  "service": "order-service"
}
```

---

### Test 2: Create Order (Authenticated)

```bash
curl -X POST ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod-123",
    "quantity": 2,
    "amount": 600.00,
    "currency": "USD"
  }' | jq .
```

**Expected Response:**

```json
{
  "orderId": "uuid",
  "tenantId": "acme-corp",
  "productId": "test-prod-123",
  "quantity": 2,
  "amount": 600.0,
  "currency": "USD",
  "status": "pending",
  "paymentGateway": "Stripe",
  "createdAt": "2024-02-15T..."
}
```

**✅ Key Verification:** Order includes `paymentGateway: "Stripe"` from config service!

---

### Test 3: List Orders

```bash
curl ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

---

### Test 4: Get Specific Order

```bash
curl ${API_ENDPOINT}/api/v1/orders/<order-id> \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

---

### Test 5: Multi-Tenant Isolation

```bash
# Get Globex token
export GLOBEX_TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $COGNITO_CLIENT_ID \
  --auth-parameters USERNAME=user@globex-inc.com,PASSWORD=GlobexUser@2024 \
  --region $AWS_REGION \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Create order for Globex
curl -X POST ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${GLOBEX_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod-999",
    "quantity": 1,
    "amount": 300.00,
    "currency": "USD"
  }' | jq .
```

**Expected Response:**

```json
{
  "orderId": "uuid",
  "tenantId": "globex-inc",
  "productId": "test-prod-999",
  "quantity": 1,
  "amount": 300.0,
  "currency": "USD",
  "status": "pending",
  "paymentGateway": "PayPal",
  "createdAt": "2024-02-15T..."
}
```

**✅ Verification:**

- Different `tenantId`
- Different `paymentGateway` (PayPal vs Stripe)
- Different validation rules (min $250 vs $500)

---

### Test 6: Verify Tenant Isolation

```bash
# Acme user lists orders (should only see Acme orders)
curl ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${TOKEN}" | jq .

# Globex user lists orders (should only see Globex orders)
curl ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${GLOBEX_TOKEN}" | jq .
```

Each tenant sees only their own orders - complete isolation! ✅

---

### Test 7: Event-Driven Refresh

Test that SSM parameter changes trigger Lambda to refresh config cache:

```bash
./test-eventbridge.sh dev
```

This script:

- Creates/updates an SSM parameter
- Triggers EventBridge rule
- Invokes Lambda function
- Lambda calls config-service to refresh cache
- Verifies the refresh occurred

**Monitor the refresh:**

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/config-service-dev-refresh-trigger \
  --follow \
  --region us-east-1

# Watch Config Service logs
aws logs tail /ecs/config-service-dev \
  --follow \
  --region us-east-1
```

---

### Test 8: Authentication Failures

#### Test without token:

```bash
curl -X POST ${API_ENDPOINT}/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod",
    "quantity": 1,
    "amount": 100.00,
    "currency": "USD"
  }'
```

**Expected:** 401 Unauthorized

#### Test with expired token:

```bash
export EXPIRED_TOKEN="<old-expired-token>"

curl -X POST ${API_ENDPOINT}/api/v1/orders \
  -H "Authorization: Bearer ${EXPIRED_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-prod",
    "quantity": 1,
    "amount": 100.00,
    "currency": "USD"
  }'
```

**Expected:** 401 Unauthorized with "Token expired" message

---

### Automated Cloud Testing Script

For convenience, use the automated test script for cloud deployments:

```bash
cd infrastructure/testing

# Auto-detect API endpoint from CloudFormation
./test-cloud.sh

# Or provide API endpoint explicitly
./test-cloud.sh https://xxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

**The script automatically:**

- ✅ Fetches API Gateway endpoint from CloudFormation (if not provided)
- ✅ Fetches Cognito credentials from CloudFormation
- ✅ Gets JWT tokens for both tenants
- ✅ Tests health check endpoint
- ✅ Tests authentication failures
- ✅ Creates orders and validates rules
- ✅ Verifies tenant isolation

---

## Testing Checklist

### Local Testing

- [ ] Config service starts on port 5000
- [ ] Order service starts on port 3001
- [ ] Health check works (no auth)
- [ ] JWT tokens obtained for both tenants
- [ ] Config retrieval works for Acme
- [ ] Config retrieval works for Globex
- [ ] Order creation works (triggers config fetch)
- [ ] Payment gateway applied from config
- [ ] Validation rules enforced from config
- [ ] List orders shows only tenant's orders
- [ ] Multi-tenant isolation verified

### Cloud Testing

- [ ] API Gateway endpoint accessible
- [ ] Health check works (no auth)
- [ ] JWT tokens obtained from Cognito
- [ ] Order creation works via API Gateway
- [ ] Payment gateway from config applied
- [ ] List orders returns tenant-specific data
- [ ] Get specific order works
- [ ] Multi-tenant isolation verified
- [ ] Authentication failures handled correctly
- [ ] Event-driven refresh tested

---

## Troubleshooting

### Issue: Cannot get JWT token

**Check:**

- Cognito User Pool ID is correct
- Cognito Client ID is correct
- User exists in Cognito
- Password is correct

**Verify user:**

```bash
aws cognito-idp admin-get-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username user@acme-corp.com \
  --region $AWS_REGION
```

---

### Issue: Order creation fails

**Check:**

- JWT token is valid and not expired
- Config service is running and reachable
- DynamoDB has data (run seed script)
- Order amount meets minimum validation

---

### Issue: Wrong payment gateway returned

**Check:**

- JWT token is for correct tenant
- DynamoDB has correct tenant configuration
- Config service cache is up to date

**Refresh cache:**

```bash
# Trigger refresh via SSM update
aws ssm put-parameter \
  --name "/config-service/acme-corp/api/test" \
  --value "test-value" \
  --type String \
  --overwrite \
  --region us-east-1
```

---

## Demo Credentials

### Acme Corporation

- **Email**: `user@acme-corp.com`
- **Password**: `AcmeUser@2024`
- **Tenant ID**: `acme-corp`
- **Payment Gateway**: Stripe
- **Min Amount**: $500

### Globex Inc

- **Email**: `user@globex-inc.com`
- **Password**: `GlobexUser@2024`
- **Tenant ID**: `globex-inc`
- **Payment Gateway**: PayPal
- **Min Amount**: $250

---

## Additional Resources

- **[Main README](../../README.md)** - Project overview
- **[Deployment Guide](../README.md)** - AWS deployment instructions
- **[Architecture Diagram](../architecture/architecture-diagram.drawio)** - System architecture
- **[Technical Deep-Dive](../../docs/blog.md)** - Architecture details
- **[Order Service Integration](../../apps/order-service/INTEGRATION_TESTING.md)** - Order service testing

---

For issues or questions, check the main documentation or create a GitHub issue.

