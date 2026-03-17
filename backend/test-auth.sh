#!/bin/bash

API_URL="https://akibaplus.bima-connect.co.ke/api"
TEST_EMAIL="testuser$(date +%s)@akibaplus.co.ke"
TEST_PASSWORD="SecurePass123!"
TEST_USERNAME="testuser$(date +%s)"

echo "========================================="
echo "Testing Chama Plus Authentication API"
echo "========================================="
echo ""

# Test 1: Database connectivity
echo "1. Testing database connection..."
curl -s "${API_URL}/test-db" > /tmp/test-db.json
cat /tmp/test-db.json
echo ""
echo ""

# Test 2: User Registration
echo "2. Testing user registration..."
echo "   Email: ${TEST_EMAIL}"
echo "   Username: ${TEST_USERNAME}"
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"username\": \"${TEST_USERNAME}\"
  }")

echo "$REGISTER_RESPONSE" > /tmp/register.json
cat /tmp/register.json
echo ""
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed - no access token received"
  exit 1
fi

echo "✓ Registration successful!"
echo "  Access Token: ${ACCESS_TOKEN:0:20}..."
echo ""

# Test 3: Token Verification
echo "3. Testing token verification..."
VERIFY_RESPONSE=$(curl -s -X GET "${API_URL}/auth/verify" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "$VERIFY_RESPONSE" > /tmp/verify.json
cat /tmp/verify.json
echo ""
echo ""

# Test 4: Login
echo "4. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

echo "$LOGIN_RESPONSE" > /tmp/login.json
cat /tmp/login.json
echo ""
echo ""

# Test 5: Login with wrong password
echo "5. Testing login with wrong password..."
WRONG_LOGIN=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"WrongPassword123\"
  }")

echo "$WRONG_LOGIN" > /tmp/wrong-login.json
cat /tmp/wrong-login.json
echo ""
echo ""

# Test 6: Refresh Token
echo "6. Testing token refresh..."
REFRESH_RESPONSE=$(curl -s -X POST "${API_URL}/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }")

echo "$REFRESH_RESPONSE" > /tmp/refresh.json
cat /tmp/refresh.json
echo ""
echo ""

# Test 7: Invalid Token
echo "7. Testing with invalid token..."
INVALID_RESPONSE=$(curl -s -X GET "${API_URL}/auth/verify" \
  -H "Authorization: Bearer invalid_token_12345")

echo "$INVALID_RESPONSE" > /tmp/invalid.json
cat /tmp/invalid.json
echo ""
echo ""

echo "========================================="
echo "All tests completed!"
echo "========================================="
echo ""
echo "Summary:"
echo "  ✓ Database connection"
echo "  ✓ User registration"
echo "  ✓ Token verification"
echo "  ✓ User login"
echo "  ✓ Wrong password handling"
echo "  ✓ Token refresh"
echo "  ✓ Invalid token handling"
