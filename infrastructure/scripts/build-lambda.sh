#!/bin/bash

# Build Lambda function for config-service refresh trigger
# Compiles TypeScript, bundles with dependencies, and uploads to S3

set -e

ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-east-1}
LAMBDA_DIR="infrastructure/lambda/refresh-trigger"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="config-service-${ENVIRONMENT}-lambda-deployment-${ACCOUNT_ID}-${REGION}"
ZIP_NAME="refresh-trigger.zip"

echo "Building Lambda function for environment: $ENVIRONMENT"
echo "=================================================="

# 1. Install dependencies
echo ""
echo "Installing dependencies..."
cd $LAMBDA_DIR
npm ci

# 2. Compile TypeScript
echo ""
echo "Compiling TypeScript..."
npm run build

# 3. Create deployment package
echo ""
echo "Creating deployment package..."
cd dist
# Copy node_modules into the package (only production deps)
cp -r ../node_modules ./node_modules
zip -r ../../../$ZIP_NAME . -x "*.ts" "*.map"
cd ../../..

echo "Lambda zip created: $ZIP_NAME"
echo "Size: $(du -h $ZIP_NAME | cut -f1)"

# 4. Upload to S3
echo ""
echo "Uploading Lambda code to S3..."
aws s3 cp $ZIP_NAME "s3://${BUCKET_NAME}/${ZIP_NAME}" --region $REGION

echo ""
echo "=================================================="
echo "Lambda function built and uploaded successfully!"
echo ""
echo "S3 Location: s3://${BUCKET_NAME}/${ZIP_NAME}"
echo ""

# 5. Cleanup
rm -f $ZIP_NAME
echo "Temporary files cleaned up"