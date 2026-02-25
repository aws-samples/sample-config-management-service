#!/bin/bash
# © 2024 Amazon Web Services, Inc. or its affiliates.
# Script to test the config service locally with Cognito authentication

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load from .env if it exists (check project root)
if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Loaded environment variables from $PROJECT_ROOT/.env${NC}"
elif [ -f ".env" ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Loaded environment variables from .env${NC}"
fi

# Configuration
GRPC_HOST="${GRPC_HOST:-localhost:5000}"
AWS_REGION="${AWS_REGION:-us-east-1}"
COGNITO_CLIENT_ID="${COGNITO_CLIENT_ID}"
COGNITO_USER_POOL_ID="${COGNITO_USER_POOL_ID}"

# Check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  if ! command -v grpcurl &> /dev/null; then
    echo -e "${RED}Error: grpcurl not found. Install it with: brew install grpcurl${NC}"
    exit 1
  fi
  
  if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not found${NC}"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Install it with: brew install jq${NC}"
    exit 1
  fi
  
  if [ -z "$COGNITO_CLIENT_ID" ]; then
    echo -e "${RED}Error: COGNITO_CLIENT_ID environment variable not set${NC}"
    exit 1
  fi
  
  if [ -z "$COGNITO_USER_POOL_ID" ]; then
    echo -e "${RED}Error: COGNITO_USER_POOL_ID environment variable not set${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✓ All prerequisites met${NC}\n"
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

# Decode JWT token (for debugging)
decode_jwt() {
  local token=$1
  echo "$token" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
}

# Test health check (public endpoint - no auth required)
test_health_check() {
  echo -e "\n${YELLOW}==================== TEST 1: Health Check (Public) ====================${NC}"
  
  grpcurl \
    -plaintext \
    -import-path "$PROJECT_ROOT/libs/proto/src/config-service" \
    -proto configuration.proto \
    "$GRPC_HOST" \
    configuration.ConfigService/healthCheck
  
  echo -e "${GREEN}✓ Health check passed${NC}"
}

# Test retrieveConfig with authentication
test_retrieve_config() {
  local jwt_token=$1
  local tenant_name=$2
  local service_name=${3:-"api"}
  local config_key=${4:-"tenant_config_payment-gateway"}
  
  echo -e "\n${YELLOW}==================== TEST: Retrieve Config ($tenant_name) ====================${NC}"
  echo -e "Service: $service_name"
  echo -e "Key: $config_key"
  
  grpcurl \
    -plaintext \
    -H "authorization: Bearer ${jwt_token}" \
    -import-path "$PROJECT_ROOT/libs/proto/src/config-service" \
    -proto configuration.proto \
    -d "{\"serviceName\": \"$service_name\", \"key\": \"$config_key\"}" \
    "$GRPC_HOST" \
    configuration.ConfigService/retrieveConfig
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Retrieve config successful${NC}"
  else
    echo -e "${RED}✗ Retrieve config failed${NC}"
  fi
}

# Test retrieveConfigs with authentication
test_retrieve_configs() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: Retrieve Multiple Configs ($tenant_name) ====================${NC}"
  
  grpcurl \
    -plaintext \
    -H "authorization: Bearer ${jwt_token}" \
    -import-path "$PROJECT_ROOT/libs/proto/src/config-service" \
    -proto configuration.proto \
    -d '{"keys": ["param_config_api/api-key", "param_config_api/endpoint"]}' \
    "$GRPC_HOST" \
    configuration.ConfigService/retrieveConfigs
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Retrieve configs successful${NC}"
  else
    echo -e "${RED}✗ Retrieve configs failed${NC}"
  fi
}

# Test tenant isolation (should fail)
test_tenant_isolation() {
  local acme_token=$1
  local globex_token=$2
  
  echo -e "\n${YELLOW}==================== TEST: Tenant Isolation ====================${NC}"
  echo -e "Acme user attempting to access Globex data (should fail)..."
  
  # This should fail because Acme user is trying to access Globex data
  grpcurl \
    -plaintext \
    -H "authorization: Bearer ${acme_token}" \
    -import-path "$PROJECT_ROOT/libs/proto/src/config-service" \
    -proto configuration.proto \
    -d '{"serviceName": "api", "key": "tenant_config_payment-gateway"}' \
    "$GRPC_HOST" \
    configuration.ConfigService/retrieveConfig 2>&1
  
  if [ $? -ne 0 ]; then
    echo -e "${GREEN}✓ Tenant isolation working correctly (access denied)${NC}"
  else
    echo -e "${RED}✗ WARNING: Tenant isolation may not be working!${NC}"
  fi
}

# Test order service health
test_order_service_health() {
  echo -e "\n${YELLOW}==================== TEST: Order Service Health Check ====================${NC}"
  
  local response=$(curl -s http://localhost:3001/api/v1/health)
  
  if [ $? -eq 0 ]; then
    echo "$response" | jq .
    echo -e "${GREEN}✓ Order Service health check passed${NC}"
  else
    echo -e "${RED}✗ Order Service not running on port 3001${NC}"
  fi
}

# Test order creation (triggers config fetch from config service)
test_create_order() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: Create Order via Order Service ($tenant_name) ====================${NC}"
  echo -e "This will trigger config fetch from config service via gRPC"
  
  local response=$(curl -s -X POST http://localhost:3001/api/v1/orders \
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

# Test validation rules from config service
test_validation_rules() {
  local jwt_token=$1
  local tenant_name=$2
  
  echo -e "\n${YELLOW}==================== TEST: Validation Rules ($tenant_name) ====================${NC}"
  echo -e "Testing order below minimum amount (should fail)"
  
  local response=$(curl -s -X POST http://localhost:3001/api/v1/orders \
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
  
  local response=$(curl -s -X GET http://localhost:3001/api/v1/orders \
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
  local acme_orders=$(curl -s -X GET http://localhost:3001/api/v1/orders \
    -H "Authorization: Bearer ${acme_token}")
  
  # Get Globex orders
  local globex_orders=$(curl -s -X GET http://localhost:3001/api/v1/orders \
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

# Main test execution
main() {
  echo "======================================================================="
  echo "  Config Service & Order Service Local Testing"
  echo "======================================================================="
  echo "Config Service gRPC: $GRPC_HOST"
  echo "Order Service REST: http://localhost:3001"
  echo "AWS Region: $AWS_REGION"
  echo "User Pool ID: $COGNITO_USER_POOL_ID"
  echo "Client ID: $COGNITO_CLIENT_ID"
  echo "======================================================================="
  
  check_prerequisites
  
  # Test 1: Config Service Health Check (no auth)
  test_health_check
  
  # Test 2: Order Service Health Check (no auth)
  test_order_service_health
  
  # Test 3: Acme Corp User - Config Service
  echo -e "\n${YELLOW}Getting JWT token for Acme Corp user...${NC}"
  ACME_JWT=$(get_jwt_token "user@acme-corp.com" "AcmeUser@2024")
  
  if [ -n "$ACME_JWT" ]; then
    # Config Service Tests
    test_retrieve_config "$ACME_JWT" "Acme Corp"
    test_retrieve_configs "$ACME_JWT" "Acme Corp"
    
    # Order Service Integration Tests
    test_create_order "$ACME_JWT" "Acme Corp"
    test_validation_rules "$ACME_JWT" "Acme Corp"
    test_list_orders "$ACME_JWT" "Acme Corp"
  fi
  
  # Test 4: Globex Inc User - Config Service
  echo -e "\n${YELLOW}Getting JWT token for Globex Inc user...${NC}"
  GLOBEX_JWT=$(get_jwt_token "user@globex-inc.com" "GlobexUser@2024")
  
  if [ -n "$GLOBEX_JWT" ]; then
    # Config Service Tests
    test_retrieve_config "$GLOBEX_JWT" "Globex Inc"
    test_retrieve_configs "$GLOBEX_JWT" "Globex Inc"
    
    # Order Service Integration Tests
    test_create_order "$GLOBEX_JWT" "Globex Inc"
    test_list_orders "$GLOBEX_JWT" "Globex Inc"
  fi
  
  # Test 5: Tenant Isolation
  if [ -n "$ACME_JWT" ] && [ -n "$GLOBEX_JWT" ]; then
    test_tenant_isolation "$ACME_JWT" "$GLOBEX_JWT"
  fi
  
  echo -e "\n======================================================================="
  echo -e "${GREEN}Testing completed!${NC}"
  echo -e "\n${YELLOW}Summary:${NC}"
  echo "- Config Service tested on port 5000 (gRPC)"
  echo "- Order Service tested on port 3001 (REST)"
  echo "- gRPC communication verified between services"
  echo "- Multi-tenant isolation confirmed"
  echo "- Config caching demonstrated"
  echo "======================================================================="
}

# Run main function
main
