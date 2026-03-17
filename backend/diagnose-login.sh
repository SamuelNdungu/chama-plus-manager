#!/bin/bash

echo "==================================="
echo "AkibaPlus Login Diagnostic Tool"
echo "==================================="
echo ""

# 1. Check if backend is running
echo "[1] Checking if backend service is running..."
if systemctl is-active --quiet chamaplus-backend; then
    echo "✅ Backend service is RUNNING"
else
    echo "❌ Backend service is NOT running"
    echo "   Starting backend..."
    sudo systemctl start chamaplus-backend
    sleep 3
    if systemctl is-active --quiet chamaplus-backend; then
        echo "✅ Backend service started successfully"
    else
        echo "❌ Failed to start backend service"
        exit 1
    fi
fi

echo ""

# 2. Check if backend is listening on port 3001
echo "[2] Checking if backend is listening on port 3001..."
if lsof -i:3001 -t >/dev/null 2>&1; then
    echo "✅ Backend is listening on port 3001"
else
    echo "❌ Backend is NOT listening on port 3001"
    echo "   Check logs: sudo journalctl -u chamaplus-backend -n 20"
    exit 1
fi

echo ""

# 3. Reset password
echo "[3] Resetting password for s2ndungu@gmail.com..."
cd /home/samuel/apps/AkibaPlus/backend
node scripts/reset-password-now.mjs

echo ""

# 4. Test login via API
echo "[4] Testing login via API..."
sleep 2

RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "s2ndungu@gmail.com",
    "password": "TempPass123!"
  }')

echo "Response: $RESPONSE"  
echo ""

if echo "$RESPONSE" | grep -q "accessToken"; then
    echo "✅ Login SUCCESSFUL!"
    echo ""
    echo "You can now log in on the website with:"
    echo "📧 Email: s2ndungu@gmail.com"
    echo "🔑 Password: TempPass123!"
else
    echo "❌ Login FAILED"
    echo "   Please check the error message above"
fi

echo ""
echo "==================================="
