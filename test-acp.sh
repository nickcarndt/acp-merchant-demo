#!/bin/bash

BASE_URL="http://localhost:3000"
AUTH_TOKEN="password1234"

echo "=== Testing ACP Endpoints ==="

# Test 1: Health check
echo -e "\n1. Health Check..."
curl -s $BASE_URL/api/health | jq

# Test 2: Create checkout
echo -e "\n2. Create Checkout..."
CHECKOUT_RESPONSE=$(curl -s -X POST $BASE_URL/api/acp/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "checkout_reference_id": "test_ref_001",
    "line_items": [
      { "product_id": "prod_running_shoe", "quantity": 1, "variant_id": "var_size_10" }
    ]
  }')
echo $CHECKOUT_RESPONSE | jq

CHECKOUT_ID=$(echo $CHECKOUT_RESPONSE | jq -r '.checkout_id')
echo "Checkout ID: $CHECKOUT_ID"

# Test 3: Update checkout
echo -e "\n3. Update Checkout..."
curl -s -X POST $BASE_URL/api/acp/checkout/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"checkout_id\": \"$CHECKOUT_ID\",
    \"shipping_option_id\": \"ship_standard\",
    \"buyer_email\": \"test@example.com\",
    \"shipping_address\": {
      \"line1\": \"123 Main St\",
      \"city\": \"San Francisco\",
      \"state\": \"CA\",
      \"postal_code\": \"94102\",
      \"country\": \"US\"
    }
  }" | jq

# Test 4: Complete checkout
echo -e "\n4. Complete Checkout..."
curl -s -X POST $BASE_URL/api/acp/checkout/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"checkout_id\": \"$CHECKOUT_ID\",
    \"payment_token\": \"demo_spt_token_12345\"
  }" | jq

echo -e "\n=== Tests Complete ==="

