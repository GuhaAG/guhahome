#!/bin/bash
set -e

echo "=========================================="
echo "guha home - Digital Ocean Setup"
echo "=========================================="
echo ""

# Prompt for required information
read -p "Enter your droplet IP address: " DROPLET_IP
read -p "Enter your domain name (e.g., guha.yourdomain.com): " DOMAIN_NAME
read -p "Enter your git repository URL: " GIT_REPO_URL
read -p "Enter your Wise API token: " WISE_API_TOKEN
read -p "Enter your Wise profile ID: " WISE_PROFILE_ID
read -p "Enter Wise environment (sandbox/production) [default: production]: " WISE_ENV
WISE_ENV=${WISE_ENV:-production}

echo ""
echo "Creating setup script for droplet..."

# Create the server setup script
cat > /tmp/server-setup.sh << 'ENDSCRIPT'
#!/bin/bash
set -e

echo "Step 1/8: Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq > /dev/null
apt-get upgrade -yqq > /dev/null

echo "Step 2/8: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1
echo "  ✓ Node version: $(node --version)"

echo "Step 3/8: Installing nginx, PM2, git, certbot..."
apt-get install -y nginx git certbot python3-certbot-nginx > /dev/null 2>&1
npm install -g pm2 > /dev/null 2>&1
echo "  ✓ All dependencies installed"

echo "Step 4/8: Creating app user 'guha'..."
if ! id -u guha > /dev/null 2>&1; then
    adduser --disabled-password --gecos "" guha > /dev/null 2>&1
fi
echo "  ✓ User created"

echo "Step 5/8: Cloning repository..."
sudo -u guha bash << 'USEREOF'
cd ~
if [ -d "guha-home" ]; then
    rm -rf guha-home
fi
git clone GITREPOURL guha-home > /dev/null 2>&1
cd guha-home
npm install --production > /dev/null 2>&1
echo "  ✓ Application cloned and dependencies installed"

# Create .env file
cat > .env << 'ENVEOF'
WISE_ENVIRONMENT=WISEENV
WISE_API_TOKEN=WISETOKEN
WISE_PROFILE_ID=WISEPROFILEID
PORT=3000
MOCK_MODE=false
ENVEOF

# Create initial settings.json
cat > settings.json << 'SETTINGSEOF'
{
  "dataStartDate": "2025-12-01",
  "dataEndDate": "2026-01-31"
}
SETTINGSEOF

echo "  ✓ Configuration files created"

# Start with PM2
pm2 start server.js --name guha-home > /dev/null 2>&1
pm2 save > /dev/null 2>&1
USEREOF

echo "Step 6/8: Configuring PM2 to start on boot..."
env PATH=$PATH:/usr/bin pm2 startup systemd -u guha --hp /home/guha > /dev/null 2>&1 || true
echo "  ✓ PM2 configured"

echo "Step 7/8: Configuring nginx..."
cat > /etc/nginx/sites-available/guha-home << 'NGINXEOF'
server {
    listen 80;
    server_name DOMAINNAME www.DOMAINNAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/guha-home /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1
systemctl reload nginx
echo "  ✓ nginx configured and reloaded"

echo "Step 8/8: Setting up SSL with Let's Encrypt..."
certbot --nginx -d DOMAINNAME -d www.DOMAINNAME --non-interactive --agree-tos --email admin@DOMAINNAME --redirect > /dev/null 2>&1 || {
    echo "  ⚠ SSL setup will be done manually (see instructions below)"
}

echo "Step 9/8: Configuring firewall..."
ufw --force enable > /dev/null 2>&1
ufw allow OpenSSH > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
echo "  ✓ Firewall configured"

echo ""
echo "=========================================="
echo "✓ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Your app should be accessible at:"
echo "  → https://DOMAINNAME"
echo "  → https://www.DOMAINNAME"
echo ""
echo "If SSL didn't auto-configure, run manually:"
echo "  sudo certbot --nginx -d DOMAINNAME -d www.DOMAINNAME"
echo ""
echo "Useful commands:"
echo "  Check status:  sudo -u guha pm2 status"
echo "  View logs:     sudo -u guha pm2 logs guha-home"
echo "  Restart app:   sudo -u guha pm2 restart guha-home"
echo ""
ENDSCRIPT

# Replace placeholders
sed -i "s|GITREPOURL|$GIT_REPO_URL|g" /tmp/server-setup.sh
sed -i "s|DOMAINNAME|$DOMAIN_NAME|g" /tmp/server-setup.sh
sed -i "s|WISETOKEN|$WISE_API_TOKEN|g" /tmp/server-setup.sh
sed -i "s|WISEPROFILEID|$WISE_PROFILE_ID|g" /tmp/server-setup.sh
sed -i "s|WISEENV|$WISE_ENV|g" /tmp/server-setup.sh

echo "Setup script created!"
echo ""
echo "Now copying to droplet and running..."
echo ""

# Copy script to droplet and execute
scp -o StrictHostKeyChecking=no /tmp/server-setup.sh root@$DROPLET_IP:/tmp/
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP "chmod +x /tmp/server-setup.sh && /tmp/server-setup.sh"

echo ""
echo "=========================================="
echo "✓ ALL DONE!"
echo "=========================================="
echo ""
echo "Visit your app at: https://$DOMAIN_NAME"
echo ""
