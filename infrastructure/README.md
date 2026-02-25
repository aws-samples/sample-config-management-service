# Deployment Guide

Complete guide for deploying the Multi-Tenant Configuration Service to AWS with CloudFormation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
- [Application Updates](#application-updates)
- [Stack Updates](#stack-updates)
- [Testing Deployment](#testing-deployment)
- [Cleanup & Teardown](#cleanup--teardown)
- [Troubleshooting](#troubleshooting)
- [Environment Variables Reference](#environment-variables-reference)
- [Monitoring](#monitoring)
- [Security Best Practices](#security-best-practices)

---

## Architecture Overview

### Infrastructure Components

The deployment consists of three CloudFormation stacks:

1. **Data Layer** (`data-layer.yaml`)
   - DynamoDB table with multi-tenant schema
   - Cognito User Pool for authentication
   - ECR repositories (config-service and order-service)
   - KMS keys for encryption

2. **Application Layer** (`app-infrastructure.yaml`)
   - VPC with private subnets (2 AZs)
   - REST API v1 (API Gateway) with Cognito authentication
   - VPC Link V2 for private ALB integration
   - WAF Web ACL (automatically associated with REST API)
   - Application Load Balancer (internal)
   - ECS Fargate services (config-service and order-service)
   - Service Discovery (AWS Cloud Map)
   - Auto-scaling configuration
   - Security groups and IAM roles

3. **Event-Driven Refresh** (`event-driven-refresh.yaml`)
   - EventBridge rules for SSM/Secrets Manager changes
   - Lambda function with gRPC dependencies
   - CloudWatch alarms for monitoring

### Multi-Tenant Data Model

**DynamoDB Schema:**

```
pk: TENANT#{tenantId}          # Partition Key
sk: CONFIG#{configType}        # Sort Key
config: {...}                  # Configuration data
isActive: boolean              # Soft delete flag
version: number                # Version number
createdAt: timestamp           # Auto-managed
updatedAt: timestamp           # Auto-managed
```

**SSM Parameter Organization:**

```
/config-service/{tenantId}/{service}/{parameter}
```

Examples:

- `/config-service/acme-corp/api/api-key`
- `/config-service/globex-inc/database/connection-string`

---

## Prerequisites

Before deploying, ensure you have:

### Required Tools

- **AWS CLI** configured with credentials and appropriate permissions
- **Node.js** 18+ installed
- **Docker** installed (for building container images)
- **jq** for JSON processing: `brew install jq`

### Required AWS Permissions

Your IAM user/role needs permissions to create:

- CloudFormation stacks
- DynamoDB tables
- Cognito User Pools
- ECR repositories
- VPC, subnets, security groups
- ECS clusters and services
- Application Load Balancers
- Lambda functions
- EventBridge rules
- CloudWatch Logs and Alarms
- IAM roles and policies
- KMS keys

### Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd config-service-monorepo

# Install dependencies
npm install
```

---

## Deployment Steps

### Complete Deployment Flow

```
1. Deploy Data Layer (DynamoDB, Cognito, ECR)
2. Build & Push Docker Images to ECR
3. Deploy Infrastructure Stack (VPC, ECS, ALB)
4. Build & Upload Lambda
5. Deploy Event-Driven Refresh Stack
6. Seed Tenant Data
7. Test via API Gateway endpoint
```

---

### Step 1: Deploy Data Layer

Deploy DynamoDB, Cognito, and ECR repositories:

```bash
aws cloudformation create-stack \
  --stack-name config-service-data \
  --template-body file://infrastructure/data-layer.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for completion (takes ~3-5 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name config-service-data \
  --region us-east-1
```

**What this creates:**

- DynamoDB table: `config-service-dev-configurations`
- Cognito User Pool: `config-service-dev-users`
- Cognito App Client (without client secret)
- ECR repositories: `config-service-dev` and `order-service-dev`
- S3 buckets for Lambda deployment packages and access logs
- KMS keys for encryption (DynamoDB and ECR)

---

### Step 2: Build and Push Docker Images

#### Config Service

```bash
./infrastructure/scripts/deploy.sh config-service
```

#### Order Service

```bash
./infrastructure/scripts/deploy.sh order-service
```

This script automatically:

- Builds Docker image for specified service (default: config-service)
- Tags with timestamp and git hash
- Pushes to ECR repository
- Tags as `latest`

---

### Step 3: Deploy Infrastructure Stack

Deploy VPC, ECS cluster, services, and ALB:

> **Important:** The `app-infrastructure.yaml` template exceeds CloudFormation's inline limit (51,200 bytes). We use `aws cloudformation deploy` with S3 to upload large templates.

```bash
# Set variables
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CFN_BUCKET="config-service-cfn-templates-${ACCOUNT_ID}-${REGION}"

# Create S3 bucket for CloudFormation templates (one-time setup)
aws s3 mb "s3://${CFN_BUCKET}" --region ${REGION} 2>/dev/null || true

# Deploy stack (automatically uploads template to S3)
aws cloudformation deploy \
  --stack-name config-service-app \
  --template-file infrastructure/app-infrastructure.yaml \
  --s3-bucket "${CFN_BUCKET}" \
  --s3-prefix cloudformation-templates \
  --parameter-overrides \
    Environment=dev \
    DataStackName=config-service-data \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}
```

**Deployment time:** 10-15 minutes

**What this creates:**

- VPC with 2 private subnets across 2 AZs
- NAT Gateway for internet access
- Internal Application Load Balancer
- ECS Cluster with Fargate tasks
- Config Service (2 tasks minimum)
- Order Service (2 tasks minimum)
- Service Discovery namespace (`config-service-dev.local`)
- Security groups for ALB, ECS services
- Auto-scaling policies (target tracking on CPU)
- CloudWatch Log Groups

---

### Step 4: Build Lambda

Build and upload Lambda function with gRPC dependencies:

```bash
./infrastructure/scripts/build-lambda.sh dev
```

This script:

- Creates Lambda deployment package
- Bundles gRPC dependencies (@grpc/grpc-js, @grpc/proto-loader)
- Uploads to S3 bucket: `config-service-dev-lambda-artifacts`
- Creates Lambda Layer for gRPC dependencies

**Manual alternative:**

```bash
cd infrastructure/lambda/refresh-trigger
npm install
npm run build

# Create deployment package
zip -r deployment.zip dist/ node_modules/

# Upload to S3
aws s3 cp deployment.zip \
  s3://config-service-dev-lambda-artifacts/refresh-trigger/deployment.zip
```

---

### Step 5: Deploy Event-Driven Refresh

Deploy EventBridge rules and Lambda for config refresh:

```bash
aws cloudformation create-stack \
  --stack-name config-service-event-driven-refresh \
  --template-body file://infrastructure/event-driven-refresh.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for completion (takes ~2-3 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name config-service-event-driven-refresh \
  --region us-east-1
```

**What this creates:**

- EventBridge rule monitoring SSM Parameter Store changes
- Lambda function with VPC configuration
- Lambda Layer with gRPC dependencies
- IAM role for Lambda execution
- CloudWatch alarms for Lambda errors and throttles

---

### Step 6: Seed Tenant Data

Get Cognito details from CloudFormation outputs and seed test data:

```bash
# Get Cognito outputs from data stack
export COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name config-service-data \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text)

export AWS_REGION=us-east-1
export ENVIRONMENT=dev

# Run seed script
npx ts-node infrastructure/scripts/seed-tenants.ts
```

This creates:

**Tenant 1: Acme Corp**

- User: `user@acme-corp.com` / `AcmeUser@2024`
- Admin: `admin@acme-corp.com` / `AcmeAdmin@2024`
- Payment Gateway: Stripe
- Min Amount: $500

**Tenant 2: Globex Inc**

- User: `user@globex-inc.com` / `GlobexUser@2024`
- Admin: `admin@globex-inc.com` / `GlobexAdmin@2024`
- Payment Gateway: PayPal
- Min Amount: $250

**Data seeded:**

- Cognito users with `custom:tenantId` attributes
- DynamoDB configurations (payment gateway, validations)
- SSM parameters (API keys, endpoints, connection strings)

---

## Application Updates

### Updating Service Images

When you make code changes to the services:

```bash
# Update config-service
./infrastructure/scripts/deploy.sh config-service

# Update order-service
./infrastructure/scripts/deploy.sh order-service
```

The deployment script:

1. Builds new Docker image
2. Tags with timestamp and git hash
3. Pushes to ECR
4. Forces ECS service to deploy new task definition
5. ECS performs rolling update (zero downtime)

### Manual Update Process

```bash
# Build and push image
docker build -t config-service .
docker tag config-service:latest ${ECR_REPO}:$(git rev-parse --short HEAD)
docker push ${ECR_REPO}:$(git rev-parse --short HEAD)

# Update ECS service
aws ecs update-service \
  --cluster config-service-dev \
  --service config-service-dev \
  --force-new-deployment \
  --region us-east-1
```

---

## Stack Updates

### Updating CloudFormation Stacks

When you modify CloudFormation templates:

#### Update Data Layer

```bash
aws cloudformation update-stack \
  --stack-name config-service-data \
  --template-body file://infrastructure/data-layer.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

#### Update Application Infrastructure

```bash
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CFN_BUCKET="config-service-cfn-templates-${ACCOUNT_ID}-${REGION}"

aws cloudformation deploy \
  --stack-name config-service-app \
  --template-file infrastructure/app-infrastructure.yaml \
  --s3-bucket "${CFN_BUCKET}" \
  --s3-prefix cloudformation-templates \
  --parameter-overrides \
    Environment=dev \
    DataStackName=config-service-data \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}
```

#### Update Event-Driven Refresh

```bash
aws cloudformation update-stack \
  --stack-name config-service-event-driven-refresh \
  --template-body file://infrastructure/event-driven-refresh.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

---

## Testing Deployment

For comprehensive testing instructions, refer to [testing/README.md](./testing/README.md).

### Quick Health Check

```bash
# Get API Gateway endpoint
export API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name config-service-app \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' \
  --output text)

# Test health
curl ${API_ENDPOINT}/api/v1/health
```

### Test with Authentication

```bash
# Get Cognito Client ID
export COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name config-service-data \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' \
  --output text)

# Get JWT token
export TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $COGNITO_CLIENT_ID \
  --auth-parameters USERNAME=user@acme-corp.com,PASSWORD=AcmeUser@2024 \
  --region us-east-1 \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# Create order (triggers config service call)
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

### Test Event-Driven Refresh

```bash
./infrastructure/testing/test-eventbridge.sh dev
```

This script updates an SSM parameter and verifies that the Lambda function triggers and refreshes the config service cache.

---

## Cleanup & Teardown

To delete all resources and avoid AWS charges:

```bash
# Delete in reverse order of creation

# 1. Delete event-driven refresh stack
aws cloudformation delete-stack \
  --stack-name config-service-event-driven-refresh \
  --region us-east-1

# 2. Delete application infrastructure
aws cloudformation delete-stack \
  --stack-name config-service-app \
  --region us-east-1

# Wait for app stack deletion (takes 5-10 minutes)
aws cloudformation wait stack-delete-complete \
  --stack-name config-service-app \
  --region us-east-1

# 3. Delete data layer
aws cloudformation delete-stack \
  --stack-name config-service-data \
  --region us-east-1

# 4. Clean up S3 buckets
aws s3 rb s3://config-service-dev-lambda-artifacts --force --region us-east-1
aws s3 rb s3://config-service-cfn-templates-${ACCOUNT_ID}-us-east-1 --force --region us-east-1

# 5. Delete ECR images (optional)
aws ecr delete-repository \
  --repository-name config-service-dev \
  --force \
  --region us-east-1

aws ecr delete-repository \
  --repository-name order-service-dev \
  --force \
  --region us-east-1
```

**Automated cleanup script:**

```bash
./infrastructure/scripts/cleanup.sh dev
```

---

## Troubleshooting

### Issue: Failed to create changeset with Early Validation error

**Symptoms:**

```
Waiting for changeset to be created..

Failed to create the changeset: Waiter ChangeSetCreateComplete failed: Waiter encountered a terminal failure state: For expression "Status" we matched expected path: "FAILED" Status: FAILED. Reason: The following hook(s)/validation failed: [AWS::EarlyValidation::ResourceExistenceCheck]. To troubleshoot Early Validation errors, use the DescribeEvents API for detailed failure information.
```

**Cause:**

This error occurs when CloudFormation's early validation detects inconsistencies between the cached template in S3 and the resources referenced in the stack. This commonly happens when:

- Updating a stack after deleting and recreating resources

**Solution:**

Delete the cached CloudFormation template from the S3 bucket

---

### Issue: ECS tasks not starting

**Symptoms:**

- ECS tasks fail to start or immediately stop
- Tasks show "STOPPED" status

**Debug steps:**

```bash
# Check ECS task logs
aws logs tail /ecs/config-service-dev --follow --region us-east-1

# Describe stopped tasks
aws ecs describe-tasks \
  --cluster config-service-dev \
  --tasks $(aws ecs list-tasks --cluster config-service-dev \
    --desired-status STOPPED --max-items 1 --query 'taskArns[0]' --output text) \
  --region us-east-1
```

**Common causes:**

- ECR image not found (verify image was pushed)
- Insufficient memory/CPU allocation
- Environment variables missing or incorrect
- Security group blocking required ports
- IAM role missing permissions

---

### Issue: Config service not reachable from Order Service

**Symptoms:**

- Order service logs show gRPC connection errors
- Health check passes but order creation fails

**Debug steps:**

```bash
# Check service discovery registration
aws servicediscovery discover-instances \
  --namespace-name config-service-dev.local \
  --service-name config-service \
  --region us-east-1

# Check security group rules
aws ec2 describe-security-groups \
  --filters Name=group-name,Values=config-service-dev-config-sg \
  --region us-east-1
```

**Common causes:**

- Service Discovery not registered (wait 1-2 minutes after deployment)
- Security group not allowing port 5000
- Wrong Service Discovery namespace

---

### Issue: Authentication fails

**Symptoms:**

- 401 Unauthorized errors
- "Invalid token" errors

**Debug steps:**

```bash
# Verify user exists in Cognito
aws cognito-idp admin-get-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username user@acme-corp.com \
  --region us-east-1

# Check user attributes
aws cognito-idp admin-get-user \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username user@acme-corp.com \
  --region us-east-1 \
  --query 'UserAttributes[?Name==`custom:tenantId`]'
```

**Common causes:**

- User doesn't have `custom:tenantId` attribute
- Token expired (tokens valid for 1 hour)
- Wrong Cognito Client ID in environment variables
- User not confirmed in Cognito

---

### Issue: Lambda not triggered on SSM changes

**Symptoms:**

- SSM parameter updates don't refresh config cache
- No Lambda invocations in CloudWatch

**Debug steps:**

```bash
# Check EventBridge rule
aws events describe-rule \
  --name config-service-dev-ssm-change \
  --region us-east-1

# Check Lambda logs
aws logs tail /aws/lambda/config-service-dev-refresh-trigger \
  --follow \
  --region us-east-1

# Test EventBridge rule manually
aws events put-events \
  --entries '[{
    "Source": "aws.ssm",
    "DetailType": "Parameter Store Change",
    "Detail": "{\"name\": \"/config-service/acme-corp/api/test\", \"operation\": \"Update\"}"
  }]' \
  --region us-east-1
```

**Common causes:**

- EventBridge rule disabled
- Lambda doesn't have VPC access to config service
- Lambda security group doesn't allow egress to port 5000
- Lambda Layer with gRPC dependencies missing
- Wrong Service Discovery endpoint in Lambda environment

---

### Issue: ALB returns 502/503 errors

**Symptoms:**

- Intermittent 502 Bad Gateway or 503 Service Unavailable errors

**Debug steps:**

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn> \
  --region us-east-1

# Check ECS service health
aws ecs describe-services \
  --cluster config-service-dev \
  --services order-service-dev \
  --region us-east-1 \
  --query 'services[0].events[0:5]'
```

**Common causes:**

- ECS tasks failing health checks
- Not enough tasks running (check desired vs running count)
- Tasks restarting due to OOMKilled
- Health check path incorrect

---

### Issue: High DynamoDB costs

**Symptoms:**

- Unexpected DynamoDB charges

**Optimization tips:**

```bash
# Check consumed capacity
aws dynamodb describe-table \
  --table-name config-service-dev-configurations \
  --region us-east-1 \
  --query 'Table.BillingModeSummary'

# Switch to On-Demand pricing if traffic is unpredictable
aws dynamodb update-table \
  --table-name config-service-dev-configurations \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Environment Variables Reference

### Config Service (ECS)

| Variable               | Description               | Example                             |
| ---------------------- | ------------------------- | ----------------------------------- |
| `DYNAMO_CONFIG_TABLE`  | DynamoDB table name       | `config-service-dev-configurations` |
| `SSM_PATH`             | SSM parameter path prefix | `/config-service`                   |
| `AWS_REGION`           | AWS region                | `us-east-1`                         |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID      | `us-east-1_XXXXXXXXX`               |
| `COGNITO_CLIENT_ID`    | Cognito App Client ID     | `xxxxxxxxxxxxxxxxxxxxxxxxxx`        |
| `GRPC_PORT`            | gRPC port                 | `5000`                              |
| `PORT`                 | HTTP port                 | `3000`                              |
| `NODE_ENV`             | Environment               | `dev`, `staging`, `prod`            |

### Order Service (ECS)

| Variable                  | Description             | Example                                        |
| ------------------------- | ----------------------- | ---------------------------------------------- |
| `AWS_REGION`              | AWS region              | `us-east-1`                                    |
| `COGNITO_USER_POOL_ID`    | Cognito User Pool ID    | `us-east-1_XXXXXXXXX`                          |
| `COGNITO_CLIENT_ID`       | Cognito App Client ID   | `xxxxxxxxxxxxxxxxxxxxxxxxxx`                   |
| `CONFIG_SERVICE_ENDPOINT` | Config Service endpoint | `config-service.config-service-dev.local:5000` |
| `PORT`                    | HTTP port               | `3001`                                         |
| `NODE_ENV`                | Environment             | `dev`, `staging`, `prod`                       |

### Lambda Function

| Variable                     | Description                            | Example                                        |
| ---------------------------- | -------------------------------------- | ---------------------------------------------- |
| `SERVICE_DISCOVERY_ENDPOINT` | Config Service endpoint from Cloud Map | `config-service.config-service-dev.local:5000` |
| `ENVIRONMENT`                | Environment name                       | `dev`                                          |

---

## Monitoring

### Key CloudWatch Metrics

**Application Load Balancer:**

- `TargetResponseTime` - Response latency
- `RequestCount` - Total requests
- `HTTPCode_Target_4XX_Count` - Client errors
- `HTTPCode_Target_5XX_Count` - Server errors
- `HealthyHostCount` - Number of healthy targets

**ECS Services:**

- `CPUUtilization` - CPU usage percentage
- `MemoryUtilization` - Memory usage percentage
- `RunningTasksCount` - Number of running tasks

**DynamoDB:**

- `ConsumedReadCapacityUnits` - Read capacity consumed
- `ConsumedWriteCapacityUnits` - Write capacity consumed
- `UserErrors` - Client-side errors
- `SystemErrors` - Server-side errors

**Lambda:**

- `Invocations` - Number of invocations
- `Errors` - Number of errors
- `Duration` - Execution time
- `Throttles` - Number of throttled requests

### CloudWatch Log Groups

- `/ecs/config-service-dev` - Config Service logs
- `/ecs/order-service-dev` - Order Service logs
- `/aws/lambda/config-service-dev-refresh-trigger` - Lambda logs
- `/aws/vpc/flowlogs/config-service-dev` - VPC Flow Logs

### CloudWatch Alarms

The Event-Driven Refresh stack creates alarms:

- `config-service-dev-refresh-lambda-errors` - Lambda execution failures
- `config-service-dev-refresh-lambda-throttles` - Lambda throttling

---

## Security Best Practices

### Authentication & Authorization

1. **JWT Authentication** - All requests validated using Cognito JWT tokens
2. **Never accept tenantId from request parameters** - Always extract from JWT token
3. **Multi-Guard Architecture** - `CognitoJwtGuard` + `TenantAccessGuard` for defense in depth
4. **Validate JWT signatures** - Services validate against Cognito JWKS endpoint

### Network Security

5. **Internal ALB** - Load balancer not exposed to public internet
6. **VPC isolation** - Services run in private subnets with no direct internet access
7. **Security groups** - Strict ingress/egress rules between services
8. **Service Discovery** - Config Service accessible only via Cloud Map private DNS

### Data Security

9. **KMS encryption** - All data encrypted at rest using AWS KMS
10. **Enforce tenant isolation** - `TenantAccessGuard` blocks cross-tenant access
11. **DynamoDB encryption** - Table encrypted with KMS key
12. **SSM Parameter encryption** - SecureString parameters with KMS

### IAM Security

13. **Principle of least privilege** - IAM roles have minimal required permissions
14. **Service-specific roles** - Each service has dedicated IAM role
15. **No long-lived credentials** - Use IAM roles for ECS tasks and Lambda
16. **Regular permission audits** - Review and trim unnecessary permissions

### Operational Security

17. **CloudWatch Logs encryption** - Log groups encrypted with KMS
18. **VPC Flow Logs** - Monitor network traffic patterns
19. **CloudTrail logging** - Audit all API calls
20. **Regular security updates** - Keep dependencies and base images updated

---

## Additional Resources

- **[Main README](../README.md)** - Project overview and quick start
- **[Testing Guide](./testing/README.md)** - Local and cloud testing instructions
- **[Architecture Diagram](./architecture/architecture-diagram.drawio)** - Drawio format
- **[Technical Deep-Dive](../docs/blog.md)** - Architecture decisions and patterns
- **[Order Service Integration](../apps/order-service/INTEGRATION_TESTING.md)** - Consumer service testing

---

## Support

For deployment issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review CloudWatch logs for your service
3. Verify all prerequisites are met
4. Check CloudFormation stack events for errors
5. Create a GitHub issue with detailed information

---

**Questions or improvements?** Open a pull request or issue on GitHub!

