#!/bin/bash
################################################################################
# ECS Service Rollback Script
# 
# This script rolls back ECS services to the previous image version:
# 1. Retrieves previous image tag from SSM Parameter Store
# 2. Updates ECS task definition with previous image
# 3. Deploys previous service version
#
# Usage:
#   ./rollback.sh [SERVICE_NAME]
#   
# Examples:
#   ./rollback.sh config-service
#   ./rollback.sh order-service
#   ./rollback.sh  # defaults to config-service
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
    echo "Usage: ./rollback.sh [SERVICE_NAME]"
    echo "  ./rollback.sh config-service"
    echo "  ./rollback.sh order-service"
    exit 1
fi

# Configuration
REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

# Service-specific configuration
if [ "$SERVICE_NAME" = "config-service" ]; then
    DATA_STACK_NAME="${DATA_STACK_NAME:-config-service-data}"
    APP_STACK_NAME="${APP_STACK_NAME:-config-service-app}"
else
    DATA_STACK_NAME="${DATA_STACK_NAME:-config-service-data}"  # Shared data stack
    APP_STACK_NAME="${APP_STACK_NAME:-order-service-app}"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          ECS Service Rollback - ${SERVICE_NAME}${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Service:     $SERVICE_NAME"
echo "  Region:      $REGION"
echo "  Environment: $ENVIRONMENT"
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

# Get current and previous image tags
info "Retrieving deployment history..."
CURRENT_TAG=$(aws ssm get-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/current-image-tag" \
    --query 'Parameter.Value' \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to get current image tag"

PREVIOUS_TAG=$(aws ssm get-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/previous-image-tag" \
    --query 'Parameter.Value' \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to get previous image tag"

if [ "$PREVIOUS_TAG" == "none" ] || [ -z "$PREVIOUS_TAG" ]; then
    error_exit "No previous version available for rollback"
fi

echo ""
echo -e "${YELLOW}Current Version:${NC}  $CURRENT_TAG"
echo -e "${YELLOW}Previous Version:${NC} $PREVIOUS_TAG"
echo ""

# Get ECR repository URI (service-specific)
info "Fetching ECR repository URI for ${SERVICE_NAME}..."

if [ "$SERVICE_NAME" = "config-service" ]; then
    ECR_OUTPUT_KEY="ECRRepositoryUri"
    REPO_NAME="config-service-${ENVIRONMENT}"
else
    ECR_OUTPUT_KEY="OrderServiceECRRepositoryUri"
    REPO_NAME="order-service-${ENVIRONMENT}"
fi

ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name "$DATA_STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey==\`${ECR_OUTPUT_KEY}\`].OutputValue" \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to fetch ECR URI"

# Verify previous image exists in ECR
info "Verifying previous image exists in ECR..."
aws ecr describe-images \
    --repository-name "$REPO_NAME" \
    --image-ids imageTag="$PREVIOUS_TAG" \
    --region "$REGION" \
    > /dev/null 2>&1 || error_exit "Previous image not found in ECR: $PREVIOUS_TAG"

info "Previous image verified: ${ECR_URI}:${PREVIOUS_TAG}"

# Confirmation prompt
echo ""
read -p "Are you sure you want to rollback? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    warn "Rollback cancelled by user"
    exit 0
fi

# Get ECS cluster and service names
info "Fetching ECS service details..."
CLUSTER_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$APP_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSCluster`].OutputValue' \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to fetch cluster name"

ECS_SERVICE_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$APP_STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSService`].OutputValue' \
    --output text \
    --region "$REGION" 2>/dev/null) || error_exit "Failed to fetch service name"

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

# Extract and update the task definition with previous image
NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq --arg IMAGE "${ECR_URI}:${PREVIOUS_TAG}" '
    .taskDefinition |
    .containerDefinitions[0].image = $IMAGE |
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
') || error_exit "Failed to process task definition JSON"

# Register new task definition
info "Registering rollback task definition..."
NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json "$NEW_TASK_DEF" \
    --region "$REGION" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text) || error_exit "Failed to register task definition"

info "Rollback task definition: $NEW_TASK_DEF_ARN"

# Update SSM parameters to swap current and previous
info "Updating deployment parameters..."

# Swap current and previous tags
aws ssm put-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/previous-image-tag" \
    --value "$CURRENT_TAG" \
    --type String \
    --overwrite \
    --region "$REGION" || warn "Failed to update previous image tag"

aws ssm put-parameter \
    --name "/${SERVICE_NAME}/${ENVIRONMENT}/current-image-tag" \
    --value "$PREVIOUS_TAG" \
    --type String \
    --overwrite \
    --region "$REGION" || error_exit "Failed to update current image tag"

# Update ECS service
info "Rolling back ECS service..."
aws ecs update-service \
    --cluster "$CLUSTER_NAME" \
    --service "$ECS_SERVICE_NAME" \
    --task-definition "$NEW_TASK_DEF_ARN" \
    --region "$REGION" \
    --force-new-deployment \
    > /dev/null || error_exit "Failed to update ECS service"

info "Rollback initiated successfully!"

# Display monitoring commands
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║               Rollback Successful! ✓${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Service:${NC}         ${SERVICE_NAME}"
echo -e "${GREEN}Rolled back to:${NC}  ${ECR_URI}:${PREVIOUS_TAG}"
echo -e "${GREEN}Task Definition:${NC} ${NEW_TASK_DEF_ARN}"
echo ""
echo -e "${YELLOW}Monitor rollback:${NC}"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $ECS_SERVICE_NAME --region $REGION"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  aws logs tail /ecs/${SERVICE_NAME}-${ENVIRONMENT} --follow --region $REGION"
echo ""
echo -e "${YELLOW}Note:${NC} You can rollback again if needed (will restore $CURRENT_TAG)"
echo ""
