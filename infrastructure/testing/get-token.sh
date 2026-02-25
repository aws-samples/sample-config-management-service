#!/bin/bash
# © 2024 Amazon Web Services, Inc. or its affiliates.
# Helper script to get JWT token from Cognito

set -e

# Load from .env if it exists
if [ -f ".env" ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$COGNITO_CLIENT_ID" ]; then
  echo "Error: COGNITO_CLIENT_ID not set"
  exit 1
fi

if [ -z "$AWS_REGION" ]; then
  echo "Error: AWS_REGION not set"
  exit 1
fi

# Get username and password from arguments
USERNAME="${1:-user@acme-corp.com}"
PASSWORD="${2:-AcmeUser@2024}"

echo "Getting JWT token for: $USERNAME"

# Authenticate and get token
RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$COGNITO_CLIENT_ID" \
  --auth-parameters USERNAME="$USERNAME",PASSWORD="$PASSWORD" \
  --region "$AWS_REGION" \
  --output json 2>&1)

if [ $? -ne 0 ]; then
  echo "Authentication failed:"
  echo "$RESPONSE"
  exit 1
fi

# Extract ID token
ID_TOKEN=$(echo "$RESPONSE" | jq -r '.AuthenticationResult.IdToken')

if [ "$ID_TOKEN" == "null" ]; then
  echo "Failed to extract ID token"
  exit 1
fi

echo ""
echo "✓ Authentication successful!"
echo ""
echo "ID Token:"
echo "$ID_TOKEN"
echo ""
echo "To use in requests:"
echo "export JWT_TOKEN=\"$ID_TOKEN\""
echo ""
echo "Decoded token:"
echo "$ID_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
