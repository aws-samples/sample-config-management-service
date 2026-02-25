# Config Service Refresh Trigger Lambda

Lambda function that automatically triggers configuration refresh in the Config Service when AWS Systems Manager Parameter Store or AWS Secrets Manager parameters change.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Building](#building)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

This Lambda function enables **zero-downtime configuration updates** by:

1. Listening for SSM Parameter Store and Secrets Manager change events via EventBridge
2. Extracting the tenant ID from the changed parameter path
3. Resolving all Config Service instances via AWS Cloud Map (Service Discovery)
4. Calling the gRPC `refreshConfig()` endpoint on each instance
5. Reloading the in-memory configuration cache without restarting services

### Key Features

- ✅ **Zero-downtime refresh** - Updates config without service restarts
- ✅ **Multi-instance support** - Calls all ECS tasks via DNS resolution
- ✅ **Tenant-aware** - Extracts tenant context from parameter paths
- ✅ **Fault-tolerant** - Continues if some instances fail (partial success)
- ✅ **VPC-integrated** - Calls private gRPC endpoints securely
- ✅ **Event-driven** - Reactive updates only when changes occur

---

## How It Works

### Event Flow

```
1. Admin updates SSM parameter:
   /config-service/acme-corp/api/api-key

2. EventBridge detects change
   (source: aws.ssm, detail-type: Parameter Store Change)

3. EventBridge triggers Lambda
   (passes event with parameter name and operation)

4. Lambda extracts tenant ID from path
   /config-service/acme-corp/api/api-key → tenantId: "acme-corp"

5. Lambda resolves Service Discovery DNS
   config-service.config-service-dev.local → [10.0.1.5, 10.0.1.6]

6. Lambda calls gRPC on each IP
   - 10.0.1.5:5000 → refreshConfig() → success
   - 10.0.1.6:5000 → refreshConfig() → success

7. Config Service reloads parameters into memory
   (zero downtime, no connection drops)

8. Lambda returns success with results
```

### gRPC Implementation

The Lambda creates a gRPC client dynamically without requiring `.proto` files by using `makeGenericClientConstructor`:

```typescript
// gRPC call path: /configuration.ConfigService/refreshConfig
const serviceDef = {
  refreshConfig: {
    path: '/configuration.ConfigService/refreshConfig',
    requestStream: false,
    responseStream: false,
    // Empty request {} → Empty response {}
  },
};
```

This lightweight approach:

- Avoids protobuf compilation overhead
- Reduces Lambda package size
- Simplifies deployment
- Still maintains type safety

---

## Architecture

### Components

```
EventBridge Rule
    ↓ (SSM parameter change detected)
Lambda Function (VPC)
    ↓ (DNS resolution via Cloud Map)
Service Discovery
    ↓ (returns IPs of all ECS tasks)
Config Service Instances (gRPC port 5000)
    ↓ (each instance reloads config from SSM)
Updated Configuration
```

### Network Architecture

```
Lambda (Private Subnet)
    ↓ (Security Group egress: port 5000)
Config Service (Private Subnet)
    ↓ (Security Group ingress: port 5000 from Lambda)
gRPC refreshConfig() call
```

---

## Prerequisites

### AWS Resources Required

- **VPC** with private subnets
- **Service Discovery** namespace and service for Config Service
- **ECS Fargate** tasks running Config Service (with gRPC on port 5000)
- **Security Groups** allowing Lambda → Config Service on port 5000
- **EventBridge Rules** for SSM/Secrets Manager changes
- **IAM Role** with permissions:
  - `servicediscovery:DiscoverInstances`
  - `ec2:CreateNetworkInterface` (for VPC Lambda)
  - `logs:CreateLogStream`, `logs:PutLogEvents`

### Local Development

- **Node.js** 18+
- **TypeScript** 5.x
- **npm** or **yarn**

---

## Environment Variables

The Lambda requires the following environment variables:

| Variable                     | Description                                | Example                                        |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `SERVICE_DISCOVERY_ENDPOINT` | Config Service endpoint from AWS Cloud Map | `config-service.config-service-dev.local:5000` |
| `ENVIRONMENT`                | Environment name (for logging/context)     | `dev`, `staging`, `prod`                       |

These are set automatically by the CloudFormation template during deployment.

---

## Building

### Install Dependencies

```bash
cd infrastructure/lambda/refresh-trigger
npm install
```

### Compile TypeScript

```bash
npm run build
```

This compiles `src/index.ts` to `dist/index.js`.

### Create Deployment Package

```bash
# Clean and build
npm run build

# Create zip with code and dependencies
zip -r deployment.zip dist/ node_modules/
```

### Automated Build Script

Use the provided build script:

```bash
cd infrastructure
./scripts/build-lambda.sh dev
```

This script:

1. Installs dependencies
2. Compiles TypeScript
3. Creates deployment package
4. Uploads to S3: `config-service-dev-lambda-deployment-bucket`

---

## Deployment

### Via CloudFormation (Recommended)

The Lambda is deployed as part of the `event-driven-refresh.yaml` stack:

```bash
aws cloudformation create-stack \
  --stack-name config-service-event-driven-refresh \
  --template-body file://infrastructure/event-driven-refresh.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

### Manual Update

To update just the Lambda code:

```bash
# Build and upload
./infrastructure/scripts/build-lambda.sh dev

# Update Lambda function
aws lambda update-function-code \
  --function-name config-service-dev-refresh-trigger \
  --s3-bucket config-service-dev-lambda-deployment-bucket \
  --s3-key refresh-trigger.zip \
  --region us-east-1
```

---

## Testing

### Test with Real SSM Parameter Change

```bash
# Update an SSM parameter
aws ssm put-parameter \
  --name "/config-service/acme-corp/api/test-param" \
  --value "test-value-$(date +%s)" \
  --type String \
  --overwrite \
  --region us-east-1

# Check Lambda logs
aws logs tail /aws/lambda/config-service-dev-refresh-trigger \
  --follow \
  --region us-east-1
```

### Test with EventBridge Test Event

```bash
# Send test event to EventBridge
aws events put-events \
  --entries '[{
    "Source": "aws.ssm",
    "DetailType": "Parameter Store Change",
    "Detail": "{\"name\": \"/config-service/acme-corp/api/test\", \"operation\": \"Update\"}"
  }]' \
  --region us-east-1
```

### Test Lambda Directly (Invoke)

```bash
aws lambda invoke \
  --function-name config-service-dev-refresh-trigger \
  --payload '{"source":"aws.ssm","detail-type":"Parameter Store Change","detail":{"name":"/config-service/acme-corp/api/test","operation":"Update"}}' \
  --region us-east-1 \
  response.json

cat response.json
```

### Automated Test Script

Use the provided test script:

```bash
./infrastructure/scripts/test-eventbridge.sh dev
```

This script:

1. Creates/updates an SSM parameter
2. Triggers EventBridge rule
3. Waits for Lambda invocation
4. Checks CloudWatch logs
5. Verifies refresh occurred

---

## Troubleshooting

### Issue: Cannot reach Config Service

**Symptoms:**

- gRPC call fails with connection refused
- Logs show DNS resolution succeeds but connection fails

**Debug:**

```bash
# Check Lambda security group
aws lambda get-function-configuration \
  --function-name config-service-dev-refresh-trigger \
  --query 'VpcConfig.SecurityGroupIds' \
  --region us-east-1

# Check egress rules allow port 5000
aws ec2 describe-security-groups \
  --group-ids <lambda-sg-id> \
  --region us-east-1
```

**Solutions:**

- Verify Lambda security group allows egress to port 5000
- Verify Config Service security group allows ingress from Lambda SG on port 5000
- Check VPC subnets have route to NAT Gateway (for DNS)

---

### Issue: DNS resolution fails

**Symptoms:**

- Logs show "getaddrinfo ENOTFOUND"
- Cannot resolve service discovery hostname

**Debug:**

```bash
# Check Service Discovery registration
aws servicediscovery discover-instances \
  --namespace-name config-service-dev.local \
  --service-name config-service \
  --region us-east-1
```

**Solutions:**

- Wait 1-2 minutes after Config Service deployment for DNS propagation
- Verify Lambda is in VPC with access to Cloud Map
- Check SERVICE_DISCOVERY_ENDPOINT environment variable is correct

---

### Issue: EventBridge not triggering Lambda

**Symptoms:**

- Parameter changes but Lambda never executes
- No CloudWatch logs for Lambda

**Debug:**

```bash
# Check EventBridge rule
aws events describe-rule \
  --name config-service-dev-ssm-change \
  --region us-east-1

# Check rule is enabled
aws events describe-rule \
  --name config-service-dev-ssm-change \
  --query 'State' \
  --region us-east-1
```

**Solutions:**

- Verify EventBridge rule is enabled
- Check Lambda permission exists for EventBridge to invoke
- Verify parameter path matches rule pattern: `/config-service/*`

---

## Monitoring

### CloudWatch Metrics

Monitor Lambda health with CloudWatch:

```bash
# Check invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=config-service-dev-refresh-trigger \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1

# Check errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=config-service-dev-refresh-trigger \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

### CloudWatch Logs

View real-time logs:

```bash
aws logs tail /aws/lambda/config-service-dev-refresh-trigger \
  --follow \
  --region us-east-1
```

### CloudWatch Alarms

The CloudFormation stack creates alarms:

- **refresh-lambda-errors** - Alerts when Lambda fails
- **refresh-lambda-throttles** - Alerts when Lambda is throttled

---

## Code Structure

```
src/
└── index.ts          # Main Lambda handler
    ├── handler()               # EventBridge event handler
    ├── callRefreshConfig()     # DNS resolution + gRPC calls
    ├── callGrpcRefresh()       # Single gRPC call
    └── createConfigServiceClient()  # gRPC client factory
```

## Security

### Network Isolation

- Runs in **private VPC subnets** (no internet access)
- Communicates only with Config Service via private IPs
- Uses **Service Discovery** internal DNS

### IAM Permissions

Follows **principle of least privilege**:

- Only `servicediscovery:DiscoverInstances` on specific namespace
- Only `logs:*` on specific log group
- VPC network interface management (AWS managed)

### Encryption

- **In-transit**: gRPC communication over VPC (internal)
- **At-rest**: CloudWatch Logs encrypted with KMS
- **Environment variables**: Can be encrypted with KMS (optional)

---

## Related Documentation

- **[Main README](../../../README.md)** - Project overview
- **[Infrastructure README](../../README.md)** - Deployment guide
- **[Testing Guide](../../../docs/TESTING.md)** - Testing instructions
- **[Event-Driven Refresh Stack](../../event-driven-refresh.yaml)** - CloudFormation template

---

## Support

For issues with the Lambda function:

1. Check CloudWatch Logs: `/aws/lambda/config-service-dev-refresh-trigger`
2. Review [Troubleshooting](#troubleshooting) section above
3. Verify security groups and VPC configuration
4. Test with manual SSM parameter update
5. Create a GitHub issue with detailed logs
