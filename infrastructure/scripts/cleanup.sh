#!/bin/bash
################################################################################
# Config Service Cleanup Script
# 
# This script removes all Config Service infrastructure:
# 1. Empties ECR repository
# 2. Deletes application infrastructure stack
# 3. Deletes data layer stack
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
DATA_STACK_NAME="${DATA_STACK_NAME:-config-service-data}"
APP_STACK_NAME="${APP_STACK_NAME:-config-service-app}"

echo -e "${RED}=== Config Service Infrastructure Cleanup ===${NC}"
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Function to print error and exit
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" 1>&2
    exit 1
}

# Function to print info
info() {
    echo -e "${GREEN}INFO: $1${NC}"
}

# Function to print warning
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error_exit "AWS CLI is not installed. Please install it first."
fi

# Warning prompt
echo -e "${RED}WARNING: This will DELETE all Config Service infrastructure!${NC}"
echo "This includes:"
echo "  - ECS Cluster and Services"
echo "  - Application Load Balancer"
echo "  - VPC and all networking resources"
echo "  - DynamoDB Configuration Table (ALL DATA WILL BE LOST)"
echo "  - ECR Repository and all Docker images"
echo "  - All CloudWatch Logs"
echo ""
read -p "Are you absolutely sure you want to proceed? Type 'DELETE' to confirm: " -r
echo ""

if [ "$REPLY" != "DELETE" ]; then
    warn "Cleanup cancelled by user"
    exit 0
fi

# Get ECR repository name
info "Fetching ECR repository name..."
ECR_REPO=$(aws cloudformation describe-stacks \
    --stack-name "$DATA_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepository`].OutputValue' \
    --output text \
    --region "$REGION" 2>/dev/null)

if [ -n "$ECR_REPO" ] && [ "$ECR_REPO" != "None" ]; then
    info "Emptying ECR repository: $ECR_REPO"
    
    # Get all image digests
    IMAGE_DIGESTS=$(aws ecr list-images \
        --repository-name "$ECR_REPO" \
        --region "$REGION" \
        --query 'imageIds[*].imageDigest' \
        --output text 2>/dev/null)
    
    if [ -n "$IMAGE_DIGESTS" ]; then
        for digest in $IMAGE_DIGESTS; do
            aws ecr batch-delete-image \
                --repository-name "$ECR_REPO" \
                --image-ids imageDigest="$digest" \
                --region "$REGION" \
                > /dev/null 2>&1 || warn "Failed to delete image: $digest"
        done
        info "ECR repository emptied successfully"
    else
        info "ECR repository is already empty"
    fi
else
    warn "ECR repository not found, skipping..."
fi

# Delete application infrastructure stack
info "Deleting application infrastructure stack: $APP_STACK_NAME"
aws cloudformation delete-stack \
    --stack-name "$APP_STACK_NAME" \
    --region "$REGION" 2>/dev/null || warn "Application stack may not exist"

if aws cloudformation describe-stacks \
    --stack-name "$APP_STACK_NAME" \
    --region "$REGION" > /dev/null 2>&1; then
    
    info "Waiting for application stack deletion to complete..."
    aws cloudformation wait stack-delete-complete \
        --stack-name "$APP_STACK_NAME" \
        --region "$REGION" || error_exit "Application stack deletion failed"
    
    info "Application stack deleted successfully"
else
    warn "Application stack does not exist"
fi

# Delete data layer stack
info "Deleting data layer stack: $DATA_STACK_NAME"
aws cloudformation delete-stack \
    --stack-name "$DATA_STACK_NAME" \
    --region "$REGION" 2>/dev/null || warn "Data stack may not exist"

if aws cloudformation describe-stacks \
    --stack-name "$DATA_STACK_NAME" \
    --region "$REGION" > /dev/null 2>&1; then
    
    info "Waiting for data stack deletion to complete..."
    aws cloudformation wait stack-delete-complete \
        --stack-name "$DATA_STACK_NAME" \
        --region "$REGION" || error_exit "Data stack deletion failed"
    
    info "Data stack deleted successfully"
else
    warn "Data stack does not exist"
fi

# Cleanup complete
echo ""
echo -e "${GREEN}=== Cleanup Complete ===${NC}"
echo "All Config Service infrastructure has been removed."
echo ""
echo "Deleted resources:"
echo "  ✓ ECS Cluster and Services"
echo "  ✓ Application Load Balancer"
echo "  ✓ VPC and networking resources"
echo "  ✓ DynamoDB Configuration Table"
echo "  ✓ ECR Repository and images"
echo "  ✓ CloudWatch Log Groups"
echo "  ✓ KMS Keys"
echo "  ✓ IAM Roles"
echo ""
warn "Note: Some resources like CloudWatch Logs may take additional time to fully delete"
