#!/bin/bash

# Chama Plus Backend Deployment Script
# Run this script to deploy the backend in production

set -e  # Exit on error

echo "🚀 Chama Plus Backend Deployment"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please do not run as root. Run as your user account."
    exit 1
fi

# Step 1: Update environment variables
echo "Step 1: Configuring environment..."
read -p "Enter your production domain (e.g., chamaplus.com): " DOMAIN
read -p "Enter database password (or press Enter to keep 'root'): " DB_PASS
DB_PASS=${DB_PASS:-root}

cat > /home/samuel/apps/AkibaPlus/backend/.env << EOF
# Production Environment
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

# CORS - Your production domain
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}

# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=${DB_PASS}
DB_NAME=chamaPlus

# JWT
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
EOF

echo "✅ Environment configured"
echo ""

# Step 2: Install/Update dependencies
echo "Step 2: Installing dependencies..."
cd /home/samuel/apps/AkibaPlus
npm install --production
echo "✅ Dependencies installed"
echo ""

# Step 3: Build frontend
echo "Step 3: Building frontend..."
npm run build
echo "✅ Frontend built to /dist"
echo ""

# Step 4: Set up systemd service
echo "Step 4: Setting up backend service..."
sudo cp /home/samuel/apps/AkibaPlus/backend/chamaplus-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable chamaplus-backend
echo "✅ Service configured"
echo ""

# Step 5: Create log files
echo "Step 5: Setting up logs..."
sudo touch /var/log/chamaplus-backend.log
sudo touch /var/log/chamaplus-backend-error.log
sudo chown samuel:samuel /var/log/chamaplus-backend*.log
echo "✅ Logs configured"
echo ""

# Step 6: Start the service
echo "Step 6: Starting backend service..."
sudo systemctl restart chamaplus-backend
sleep 2
sudo systemctl status chamaplus-backend --no-pager
echo "✅ Backend service started"
echo ""

# Step 7: Update nginx configuration
echo "Step 7: Nginx configuration..."
echo "⚠️  Please update your nginx configuration manually:"
echo "    1. Edit /etc/nginx/sites-available/chamaplus (or your site config)"
echo "    2. Update server_name to: ${DOMAIN}"
echo "    3. Ensure proxy_pass points to: http://127.0.0.1:3001"
echo "    4. Test: sudo nginx -t"
echo "    5. Reload: sudo systemctl reload nginx"
echo ""

# Step 8: SSL Certificate (if needed)
echo "Step 8: SSL Certificate..."
echo "To set up HTTPS with Let's Encrypt:"
echo "    sudo apt install certbot python3-certbot-nginx"
echo "    sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""

# Final checks
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📋 Final Checklist:"
echo "  ☐ Update nginx configuration"
echo "  ☐ Set up SSL certificate"
echo "  ☐ Update .env with real database credentials"
echo "  ☐ Test API: curl http://localhost:3001/api/test-db"
echo "  ☐ Test through domain: curl https://${DOMAIN}/api/test-db"
echo "  ☐ Set up database backups"
echo "  ☐ Configure firewall (UFW)"
echo "  ☐ Set up monitoring"
echo ""
echo "🔍 Useful Commands:"
echo "  Check backend: sudo systemctl status chamaplus-backend"
echo "  View logs: sudo tail -f /var/log/chamaplus-backend.log"
echo "  Restart: sudo systemctl restart chamaplus-backend"
echo "  Stop: sudo systemctl stop chamaplus-backend"
echo ""
