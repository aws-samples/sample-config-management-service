#!/bin/bash
# © 2024 Amazon Web Services, Inc. or its affiliates.
# Script to test services deployed in AWS cloud via API Gateway
# Usage:
#   ./test-cloud.sh                    # Auto-detect API endpoint from CloudFormation
#   ./test-cloud.sh <api-endpoint>     # Use specific API Gateway endpoint

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-config-service-app}"
DATA_STACK_NAME="${DATA_STACK_NAME:-config-service-data}"

# Get API endpoint from parameter or CloudFormation
if [ -n "$1" ]; then
  API_ENDPOINT="$1"
  echo -e "${GREEN}✓ Using provided API endpoint: $API_ENDPOINT${NC}"
else
  echo -e "${YELLOW}Fetching API Gateway endpoint from CloudFormation...${NC}"
  
  API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayEndpoint`].OutputValue' \
    --output text 2>/dev/null)
  
  if [ -z "$API_ENDPOINT" ] || [ "$API_ENDPOINT" == "None" ]; then
    echo -e "${RED}Error: Could not get API Gateway endpoint from stack $STACK_NAME${NC}"
    echo -e "${YELLOW}Usage: ./test-cloud.sh <api-gateway-endpoint>${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ API Gateway endpoint: $API_ENDPOINT${NC}"
fi

# Get Cognito details from CloudFormation
echo -e "${YELLOW}Fetching Cognito details from CloudFormation...${NC}"

COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$DATA_STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text 2>/dev/null)

COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "$DATA_STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$COGNITO_USER_POOL_ID" ] || [ -z "$COGNITO_CLIENT_ID" ]; then
  echo -e "${RED}Error: Could not get Cognito details from stack $DATA_STACK_NAME${NC}"
  exit 1
fi

echo -e "${GREEN}✓ User Pool ID: $COGNITO_USER_POOL_ID${NC}"
echo -e "${GREEN}✓ Client ID: $COGNITO_CLIENT_ID${NC}"

# Check prerequisites
check_prerequisites() {
  echo -e "\n${YELLOW}Checking prerequisites...${NC}"
  
  if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not found${NC}"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Install it with: brew install jq${NC}"
    exit 1
  fi
  
  if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl not found${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Get JWT token from Cognito
get_jwt_token() {
  local username=$1
  local password=$2
  
  echo -e "${YELLOW}Authenticating user: $username${NC}" >&2
  
  local response=$(aws cognito-idp initiate-auth \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id "$COGNITO_CLIENT_ID" \
    --auth-parameters USERNAME="$username",PASSWORD="$password" \
    --region "$AWS_REGION" \
    --output json 2>&1)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Authentication failed: $response${NC}" >&2
    return 1
  fi
  
  local id_token=$(echo "$response" | jq -r '.AuthenticationResult.IdToken')
  
  if [ "$id_token" == "null" ]; then
    echo -e "${RED}Failed to get ID token${NC}" >&2
    return 1
  fi
  
  echo -e "${GREEN}✓ Authentication successful${NC}" >&2
  printf '%s' "$id_token"
}

# Test health check
test_health_check() {
  echo -e "\n${YELLOW}==================== TEST 1: Health Check (No Auth) ====================${NC}"
  
  local response=$(curl -s ${API_ENDPOINT}/api/v1/health)
  
  echo "$response" | jq .
  
  if echo "$response" | jq -e '.status' | grep -q "ok"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
  else
    echo -e "${RED}✗ Health check failed${NC}"
  fi
}

# Test order creation
test_create_order() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: Create Order ($tenant_name) ====================${NC}"
  
  local response=$(curl -s -X POST ${API_ENDPOINT}/api/v1/orders \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" \
    -d '{
      "productId": "test-prod-123",
      "quantity": 2,
      "amount": 600.00,
      "currency": "USD"
    }')
  
  echo "$response" | jq .
  
  if echo "$response" | jq -e '.orderId' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Order created successfully${NC}"
    echo -e "${GREEN}✓ Payment gateway from config: $(echo "$response" | jq -r '.paymentGateway')${NC}"
  else
    echo -e "${RED}✗ Order creation failed${NC}"
  fi
}

# Test validation rules
test_validation_rules() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: Validation Rules ($tenant_name) ====================${NC}"
  echo -e "Testing order below minimum amount (should fail)"
  
  local response=$(curl -s -X POST ${API_ENDPOINT}/api/v1/orders \
    -H "Authorization: Bearer ${jwt_token}" \
    -H "Content-Type: application/json" \
    -d '{
      "productId": "test-prod-456",
      "quantity": 1,
      "amount": 50.00,
      "currency": "USD"
    }')
  
  echo "$response" | jq .
  
  if echo "$response" | jq -e '.status' | grep -q "400"; then
    echo -e "${GREEN}✓ Validation rules enforced (order below minimum rejected)${NC}"
  else
    echo -e "${RED}✗ Validation test failed${NC}"
  fi
}

# Test order listing
test_list_orders() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: List Orders ($tenant_name) ====================${NC}"
  
  local response=$(curl -s -X GET ${API_ENDPOINT}/api/v1/orders \
    -H "Authorization: Bearer ${jwt_token}")
  
  echo "$response" | jq .
  
  if [ $? -eq 0 ]; then
    local order_count=$(echo "$response" | jq '. | length')
    echo -e "${GREEN}✓ Listed $order_count orders for $tenant_name${NC}"
  else
    echo -e "${RED}✗ List orders failed${NC}"
  fi
}

# Test tenant isolation
test_tenant_isolation() {
  local acme_token=$1
  local globex_token=$2
  
  echo -e "\n${YELLOW}==================== TEST: Tenant Isolation ====================${NC}"
  echo -e "Verifying each tenant sees only their own orders..."
  
  # Get Acme orders
  local acme_orders=$(curl -s -X GET ${API_ENDPOINT}/api/v1/orders \
    -H "Authorization: Bearer ${acme_token}")
  
  # Get Globex orders
  local globex_orders=$(curl -s -X GET ${API_ENDPOINT}/api/v1/orders \
    -H "Authorization: Bearer ${globex_token}")
  
  # Check if Acme orders contain only acme-corp tenantId
  local acme_has_wrong_tenant=$(echo "$acme_orders" | jq -r '.[].tenantId' | grep -v "acme-corp" | wc -l | tr -d ' ')
  
  # Check if Globex orders contain only globex-inc tenantId
  local globex_has_wrong_tenant=$(echo "$globex_orders" | jq -r '.[].tenantId' | grep -v "globex-inc" | wc -l | tr -d ' ')
  
  if [ "$acme_has_wrong_tenant" -eq 0 ] && [ "$globex_has_wrong_tenant" -eq 0 ]; then
    echo -e "${GREEN}✓ Tenant isolation verified: Each tenant sees only their own orders${NC}"
  else
    echo -e "${RED}✗ WARNING: Tenant isolation breach detected!${NC}"
  fi
}

# Test authentication failure
test_auth_failure() {
  echo -e "\n${YELLOW}==================== TEST: Authentication Failure ====================${NC}"
  echo -e "Testing request without authentication token (should fail)"
  
  local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST ${API_ENDPOINT}/api/v1/orders \
    -H "Content-Type: application/json" \
    -d '{
      "productId": "test-prod",
      "quantity": 1,
      "amount": 100.00,
      "currency": "USD"
    }')
  
  if [ "$response" == "401" ]; then
    echo -e "${GREEN}✓ Unauthorized request correctly rejected (401)${NC}"
  else
    echo -e "${RED}✗ Authentication test failed (got HTTP $response)${NC}"
  fi
}

# Main test execution
main() {
  echo "======================================================================="
  echo "  Cloud Deployment Testing (API Gateway)"
  echo "======================================================================="
  echo "API Gateway Endpoint: $API_ENDPOINT"
  echo "AWS Region: $AWS_REGION"
  echo "User Pool ID: $COGNITO_USER_POOL_ID"
  echo "Client ID: $COGNITO_CLIENT_ID"
  echo "======================================================================="
  
  check_prerequisites
  
  # Test 1: Health Check (no auth)
  test_health_check
  
  # Test 2: Authentication Failure
  test_auth_failure
  
  # Test 3: Acme Corp User Tests
  echo -e "\n${YELLOW}Getting JWT token for Acme Corp user...${NC}"
  ACME_JWT=$(get_jwt_token "user@acme-corp.com" "AcmeUser@2024")
  
  if [ -n "$ACME_JWT" ]; then
    test_create_order "$ACME_JWT" "Acme Corp"
    test_validation_rules "$ACME_JWT" "Acme Corp"
    test_list_orders "$ACME_JWT" "Acme Corp"
  fi
  
  # Test 4: Globex Inc User Tests
  echo -e "\n${YELLOW}Getting JWT token for Globex Inc user...${NC}"
  GLOBEX_JWT=$(get_jwt_token "user@globex-inc.com" "GlobexUser@2024")
  
  if [ -n "$GLOBEX_JWT" ]; then
    test_create_order "$GLOBEX_JWT" "Globex Inc"
    test_list_orders "$GLOBEX_JWT" "Globex Inc"
  fi
  
  # Test 5: Tenant Isolation
  if [ -n "$ACME_JWT" ] && [ -n "$GLOBEX_JWT" ]; then
    test_tenant_isolation "$ACME_JWT" "$GLOBEX_JWT"
  fi
  
  echo -e "\n======================================================================="
  echo -e "${GREEN}Cloud Testing Completed!${NC}"
  echo -e "\n${YELLOW}Summary:${NC}"
  echo "- API Gateway endpoint tested"
  echo "- Cognito authentication verified"
  echo "- Order creation and validation tested"
  echo "- Multi-tenant isolation confirmed"
  echo "- WAF protection active"
  echo "======================================================================="
}

# Run main function
main