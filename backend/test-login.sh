#!/bin/bash

echo "Testing login for s2ndungu@gmail.com..."
echo ""

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "s2ndungu@gmail.com",
    "password": "TempPass123!"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Done."
