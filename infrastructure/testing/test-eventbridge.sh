#!/bin/bash

# Test EventBridge Event-Driven Refresh
# This script tests if SSM parameter changes trigger Lambda via EventBridge

set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}

echo "Testing EventBridge Event-Driven Refresh for environment: $ENVIRONMENT"
echo "=================================================="

# 1. Check Lambda function exists
echo ""
echo "Checking Lambda function..."
LAMBDA_NAME="config-service-${ENVIRONMENT}-refresh-trigger"
aws lambda get-function --function-name $LAMBDA_NAME --region $REGION > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Lambda function exists: $LAMBDA_NAME"
else
    echo "Lambda function not found: $LAMBDA_NAME"
    exit 1
fi

# 2. Check EventBridge rules
echo ""
echo "Checking EventBridge rules..."
SSM_RULE="config-service-${ENVIRONMENT}-ssm-change"
aws events describe-rule --name $SSM_RULE --region $REGION > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "SSM EventBridge rule exists: $SSM_RULE"
else
    echo "SSM EventBridge rule not found"
fi

# 3. Create/Update test SSM parameter
echo ""
echo "Creating test SSM parameter to trigger event..."
TEST_PARAM="/config-service/test-tenant/api/test-key"
TEST_VALUE="test-value-$(date +%s)"

aws ssm put-parameter \
    --name "$TEST_PARAM" \
    --value "$TEST_VALUE" \
    --type String \
    --overwrite \
    --region $REGION

echo "Created/Updated parameter: $TEST_PARAM"

# 4. Wait for Lambda invocation
echo ""
echo "Waiting 10 seconds for EventBridge to trigger Lambda..."
sleep 10

# 5. Check Lambda logs
echo ""
echo "Checking Lambda logs..."
LOG_GROUP="/aws/lambda/$LAMBDA_NAME"

# Get latest log stream
LATEST_STREAM=$(aws logs describe-log-streams \
    --log-group-name $LOG_GROUP \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --region $REGION \
    --query 'logStreams[0].logStreamName' \
    --output text)

if [ "$LATEST_STREAM" != "None" ] && [ -n "$LATEST_STREAM" ]; then
    echo "Latest log stream: $LATEST_STREAM"
    echo ""
    echo "Recent logs:"
    aws logs get-log-events \
        --log-group-name $LOG_GROUP \
        --log-stream-name "$LATEST_STREAM" \
        --limit 20 \
        --region $REGION \
        --query 'events[*].message' \
        --output text
else
    echo "No log streams found yet. Lambda may not have been invoked."
fi

# 6. Check CloudWatch metrics
echo ""
echo "Checking Lambda invocation metrics (last 5 minutes)..."
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value=$LAMBDA_NAME \
    --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --region $REGION \
    --query 'Datapoints[0].Sum' \
    --output text

# 7. Cleanup test parameter
echo ""
echo "Cleaning up test parameter..."
aws ssm delete-parameter --name "$TEST_PARAM" --region $REGION
echo "Deleted test parameter"

echo ""
echo "=================================================="
echo "EventBridge test complete!"
echo ""
echo "To manually check Lambda logs:"
echo "aws logs tail /aws/lambda/$LAMBDA_NAME --follow --region $REGION"
