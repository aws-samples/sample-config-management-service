#!/bin/bash
################################################################################
# ECS Service Deployment Script
# 
# This script automates the deployment of ECS services (config-service, order-service):
# 1. Builds Docker image
# 2. Pushes to ECR
# 3. Updates ECS task definition
# 4. Deploys new service version
#
# IMPORTANT DEPLOYMENT SEQUENCE:
# 1. Deploy data stack (config-service-data) - Creates ECR, DynamoDB, Cognito
# 2. Run this script to build and push initial image to ECR
# 3. Deploy app stack (config-service-app) - Creates VPC, ECS, etc.
#    NOTE: App stack will only complete successfully after:
#    - Docker image exists in ECR (from step 2)
#    - ECS tasks start successfully with the image
#    - Health checks pass
#
# Usage:
#   ./deploy.sh [SERVICE_NAME]
#   
# Examples:
#   ./deploy.sh config-service
#   ./deploy.sh order-service
#   ./deploy.sh  # defaults to config-service
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service name from argument (default to config-service for backward compatibility)
SERVICE_NAME="${1:-config-service}"

# Validate service name
if [[ "$SERVICE_NAME" != "config-service" && "$SERVICE_NAME" != "order-service" ]]; then
    echo -e "${RED}ERROR: Invalid service name '${SERVICE_NAME}'${NC}"
    echo "Valid options: config-service, order-service"
    echo ""
    echo "Usage: ./deploy.sh [SERVICE_NAME]"
    echo "  ./deploy.sh config-service"
    echo "  ./deploy.sh order-service"
    exit 1
fi

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

# Service-specific configuration
DATA_STACK_NAME="${DATA_STACK_NAME:-config-service-data}"
APP_STACK_NAME="${APP_STACK_NAME:-config-service-app}"  # Both services in same stack

if [ "$SERVICE_NAME" = "config-service" ]; then
    SERVICE_PATH="apps/config-service"
    DOCKERFILE_PATH="."
else
    SERVICE_PATH="apps/order-service"
    DOCKERFILE_PATH="apps/order-service"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ECS Service Deployment - ${SERVICE_NAME}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Configuration:${NC}"
echo "  Service:     $SERVICE_NAME"
echo "  Region:      $REGION"
echo "  Environment: $ENVIRONMENT"
echo "  Data Stack:  $DATA_STACK_NAME"
echo "  App Stack:   $APP_STACK_NAME"
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

# Set container command to docker only
CONTAINER_CMD="docker"

info "Using container tool: $CONTAINER_CMD"

# Get ECR repository URI (service-specific)
info "Fetching ECR repository URI for ${SERVICE_NAME}..."

if [ "$SERVICE_NAME" = "config-service" ]; then
    ECR_OUTPUT_KEY="ECRRepositoryUri"
else
    ECR_OUTPUT_KEY="OrderServiceECRRepositoryUri"
fi

ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name "$DATA_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey==\`${ECR_OUTPUT_KEY}\`].OutputValue" \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to fetch ECR URI from data stack"

if [ -z "$ECR_URI" ] || [ "$ECR_URI" = "None" ]; then
    error_exit "ECR repository not found. Ensure the data stack has been deployed with ECR repository for ${SERVICE_NAME}"
fi

info "ECR Repository: $ECR_URI"

# Generate image tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
IMAGE_TAG="${ENVIRONMENT}-${TIMESTAMP}-${GIT_HASH}"

info "Building container image with tag: $IMAGE_TAG"

# Build container image
PROJECT_ROOT="$(dirname "$0")/../.."
cd "$PROJECT_ROOT" || error_exit "Failed to change to project root"

# Build with appropriate Dockerfile
if [ "$SERVICE_NAME" = "config-service" ]; then
    info "Building from root Dockerfile..."
    $CONTAINER_CMD buildx build --platform=linux/amd64 --load -t "${SERVICE_NAME}:${IMAGE_TAG}" . || error_exit "Container build failed"
else
    info "Building from ${DOCKERFILE_PATH}/Dockerfile..."
    $CONTAINER_CMD buildx build --platform=linux/amd64 --load -f "${DOCKERFILE_PATH}/Dockerfile" -t "${SERVICE_NAME}:${IMAGE_TAG}" . || error_exit "Container build failed"
fi

# Tag image for ECR
$CONTAINER_CMD tag "${SERVICE_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}" || error_exit "Failed to tag image"

# Login to ECR
info "Authenticating to ECR..."
aws ecr get-login-password --region "$REGION" | \
    $CONTAINER_CMD login --username AWS --password-stdin "$ECR_URI" || error_exit "ECR authentication failed"

# Push image to ECR
info "Pushing image to ECR with versioned tag..."
$CONTAINER_CMD push "${ECR_URI}:${IMAGE_TAG}" || error_exit "Failed to push image with tag"

# Also tag and push as 'latest' (may fail if tag immutability is enabled)
info "Tagging and pushing as 'latest'..."
$CONTAINER_CMD tag "${SERVICE_NAME}:${IMAGE_TAG}" "${ECR_URI}:latest" || warn "Failed to tag as latest"
if $CONTAINER_CMD push "${ECR_URI}:latest" 2>/dev/null; then
    info "Image pushed successfully: ${ECR_URI}:${IMAGE_TAG} and ${ECR_URI}:latest"
else
    warn "Could not push 'latest' tag (tag immutability may be enabled). Versioned tag pushed successfully."
    info "Image pushed successfully: ${ECR_URI}:${IMAGE_TAG}"
fi

# Update SSM parameters for deployment tracking
info "Updating deployment parameters..."

# Get current image tag
CURRENT_TAG=$(aws ssm get-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/current-image-tag" \
    --query 'Parameter.Value' \
    --output text \
    --region "$REGION" 2>/dev/null || echo "none")

# Store current as previous (for rollback)
if [ "$CURRENT_TAG" != "none" ] && [ "$CURRENT_TAG" != "latest" ]; then
    aws ssm put-parameter \
        --name "/${SERVICE_NAME}/${ENVIRONMENT}/previous-image-tag" \
        --value "$CURRENT_TAG" \
        --type String \
        --overwrite \
        --region "$REGION" || warn "Failed to update previous image tag"
fi

# Store new as current
aws ssm put-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/current-image-tag" \
    --value "$IMAGE_TAG" \
    --type String \
    --overwrite \
    --region "$REGION" || error_exit "Failed to update current image tag"

# Get ECS cluster and service names
info "Fetching ECS service details..."
CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$APP_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSCluster`].OutputValue' \
    --output text \
    --region "$REGION" 2>/dev/null)

if [ -z "$CLUSTER_NAME" ] || [ "$CLUSTER_NAME" = "None" ]; then
    error_exit "Failed to fetch cluster name from app stack. Ensure app stack is deployed and has completed successfully."
fi

# Service-specific output key
if [ "$SERVICE_NAME" = "config-service" ]; then
    SERVICE_OUTPUT_KEY="ECSService"
else
    SERVICE_OUTPUT_KEY="OrderServiceECSService"
fi

ECS_SERVICE_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$APP_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey==\`${SERVICE_OUTPUT_KEY}\`].OutputValue" \
    --output text \
    --region "$REGION" 2>/dev/null)

if [ -z "$ECS_SERVICE_NAME" ] || [ "$ECS_SERVICE_NAME" = "None" ]; then
    error_exit "Failed to fetch service name from app stack. Ensure app stack is deployed and has completed successfully."
fi

info "Cluster: $CLUSTER_NAME"
info "ECS Service: $ECS_SERVICE_NAME"

# Get current task definition
info "Retrieving current task definition..."
TASK_DEFINITION=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$ECS_SERVICE_NAME" \
    --query 'services[0].taskDefinition' \
    --output text \
    --region "$REGION") || error_exit "Failed to get task definition"

info "Current task definition: $TASK_DEFINITION"

# Get task definition JSON
TASK_DEF_JSON=$(aws ecs describe-task-definition \
    --task-definition "$TASK_DEFINITION" \
    --region "$REGION") || error_exit "Failed to describe task definition"

# Extract and update the task definition
NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq --arg IMAGE "${ECR_URI}:${IMAGE_TAG}" '
    .taskDefinition |
    .containerDefinitions[0].image = $IMAGE |
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
') || error_exit "Failed to process task definition JSON"

# Register new task definition
info "Registering new task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_TASK_DEF" \
    --region "$REGION" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text) || error_exit "Failed to register new task definition"

info "New task definition: $NEW_TASK_DEF_ARN"

# Update ECS service
info "Updating ECS service with new task definition..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$ECS_SERVICE_NAME" \
    --task-definition "$NEW_TASK_DEF_ARN" \
    --region "$REGION" \
    --force-new-deployment \
    > /dev/null || error_exit "Failed to update ECS service"

info "Service update initiated successfully!"

# Display monitoring commands
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║               Deployment Successful! ✓${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Service:${NC}         ${SERVICE_NAME}"
echo -e "${GREEN}Image:${NC}           ${ECR_URI}:${IMAGE_TAG}"
echo -e "${GREEN}Task Definition:${NC} ${NEW_TASK_DEF_ARN}"
echo ""
echo -e "${YELLOW}Monitor deployment:${NC}"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  aws logs tail /ecs/${SERVICE_NAME}-${ENVIRONMENT} --follow --region $REGION"
echo ""
echo -e "${YELLOW}Rollback if needed:${NC}"
echo "  cd infrastructure/scripts && ./rollback.sh ${SERVICE_NAME}"
echo ""
