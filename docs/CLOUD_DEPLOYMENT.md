# Digital Ocean Deployment Plan - Wise Expense Tracker

## Overview
Deploy the Wise Expense Tracker Node.js application to a Digital Ocean Ubuntu droplet with nginx reverse proxy, PM2 process manager, Let's Encrypt SSL, and git-based deployment workflow.

## Prerequisites (Information Needed)
- SSH access to your Digital Ocean droplet (IP address and SSH key/password)
- Domain name or subdomain pointing to your droplet's IP (e.g., expenses.yourdomain.com)
- Wise API credentials (WISE_API_TOKEN and WISE_PROFILE_ID)
- Git repository URL (if pushing to remote, or use local files)

## Deployment Steps

### 1. Server Preparation
**Connect to droplet via SSH:**
```bash
ssh root@your_droplet_ip
```

**Update system packages:**
```bash
apt update && apt upgrade -y
```

**Install Node.js (v20.x LTS):**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Verify installation
npm --version
```

**Install nginx:**
```bash
apt install -y nginx
systemctl status nginx  # Verify it's running
```

**Install PM2 globally:**
```bash
npm install -g pm2
```

**Install Git (if not already installed):**
```bash
apt install -y git
```

### 2. Set Up Application User (Security Best Practice)
**Create dedicated app user (don't run as root):**
```bash
adduser --disabled-password --gecos "" wiseapp
usermod -aG sudo wiseapp  # Optional: if you need sudo access
```

**Switch to app user:**
```bash
su - wiseapp
```

### 3. Clone and Configure Application
**Navigate to home directory and clone repository:**
```bash
cd ~
git clone <your_git_repository_url> wise-expense-tracker
cd wise-expense-tracker
```

**Install dependencies:**
```bash
npm install
```

**Create .env file with production configuration:**
```bash
cat > .env << 'EOF'
# Wise API Configuration
WISE_ENVIRONMENT=production
WISE_API_TOKEN=your_actual_token_here
WISE_PROFILE_ID=your_actual_profile_id_here

# Server Configuration
PORT=3000

# Development Mode
MOCK_MODE=false
EOF
```

**Update the .env file with your actual credentials:**
```bash
nano .env  # Edit with your real values
```

**Initialize settings.json:**
```bash
cat > settings.json << 'EOF'
{
  "dataStartDate": "2025-12-01",
  "dataEndDate": "2026-01-31"
}
EOF
```

### 4. Set Up PM2 Process Manager
**Start application with PM2:**
```bash
pm2 start server.js --name wise-expense-tracker
```

**Configure PM2 to start on system boot:**
```bash
pm2 startup systemd
# Follow the instructions output by the command above (it will give you a command to run)
pm2 save
```

**Verify PM2 is running:**
```bash
pm2 status
pm2 logs wise-expense-tracker  # Check logs
```

### 5. Configure nginx Reverse Proxy
**Exit back to root user (or use sudo):**
```bash
exit  # Exit from wiseapp user back to root
```

**Create nginx configuration:**
```bash
cat > /etc/nginx/sites-available/wise-expense-tracker << 'EOF'
server {
    listen 80;
    server_name your_domain.com;  # REPLACE with your actual domain

    # Redirect all HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://$server_name$request_uri;

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
EOF
```

**Update the domain name in the config:**
```bash
nano /etc/nginx/sites-available/wise-expense-tracker
# Replace your_domain.com with your actual domain
```

**Enable the site:**
```bash
ln -s /etc/nginx/sites-available/wise-expense-tracker /etc/nginx/sites-enabled/
```

**Test nginx configuration:**
```bash
nginx -t
```

**Reload nginx:**
```bash
systemctl reload nginx
```

**Test HTTP access:**
Visit http://your_domain.com in browser - should see the app

### 6. Set Up Let's Encrypt SSL
**Install Certbot:**
```bash
apt install -y certbot python3-certbot-nginx
```

**Obtain SSL certificate:**
```bash
certbot --nginx -d your_domain.com
# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (recommended)
```

**Verify auto-renewal:**
```bash
certbot renew --dry-run
```

**Update nginx config to enforce HTTPS:**
The certbot command above should auto-update the nginx config. Verify:
```bash
cat /etc/nginx/sites-available/wise-expense-tracker
```

Should now include SSL certificates and HTTPS redirect.

**Test HTTPS access:**
Visit https://your_domain.com - should see secure connection

### 7. Create Automated Deployment Script
**Create deployment script on the server:**
```bash
su - wiseapp  # Switch to app user
cd ~/wise-expense-tracker
```

**Create deploy.sh:**
```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting deployment..."

# Navigate to app directory
cd ~/wise-expense-tracker

# Pull latest changes from git
echo "Pulling latest code from git..."
git pull origin master

# Install/update dependencies
echo "Installing dependencies..."
npm install --production

# Restart PM2 process
echo "Restarting application with PM2..."
pm2 restart wise-expense-tracker

# Show status
echo "Deployment complete!"
pm2 status
pm2 logs wise-expense-tracker --lines 20
EOF
```

**Make script executable:**
```bash
chmod +x deploy.sh
```

**Test the deployment script:**
```bash
./deploy.sh
```

### 8. Optional: Configure Basic Firewall (UFW)
**Exit to root user:**
```bash
exit
```

**Enable UFW and allow necessary ports:**
```bash
ufw allow OpenSSH      # SSH access (port 22)
ufw allow 'Nginx Full' # HTTP (80) and HTTPS (443)
ufw enable
ufw status
```

## Post-Deployment Verification

### Check Application Status
```bash
# As wiseapp user
su - wiseapp
pm2 status
pm2 logs wise-expense-tracker --lines 50
```

### Test All Endpoints
1. Visit https://your_domain.com - Should load the UI
2. Check health endpoint: https://your_domain.com/api/health
3. Test settings modal and date range configuration
4. Verify transactions are loading from Wise API

### Monitor Logs
```bash
# Real-time logs
pm2 logs wise-expense-tracker

# View specific number of lines
pm2 logs wise-expense-tracker --lines 100
```

## Maintenance Operations

### Deploy Updates
```bash
ssh wiseapp@your_droplet_ip
cd ~/wise-expense-tracker
./deploy.sh
```

### Restart Application
```bash
pm2 restart wise-expense-tracker
```

### View Logs
```bash
pm2 logs wise-expense-tracker
```

### Update Environment Variables
```bash
cd ~/wise-expense-tracker
nano .env
pm2 restart wise-expense-tracker  # Restart to apply changes
```

### Check PM2 Process Info
```bash
pm2 info wise-expense-tracker
pm2 monit  # Interactive monitoring
```

### Update SSL Certificate (Auto-renewal should handle this)
```bash
# As root
certbot renew
systemctl reload nginx
```

## Troubleshooting

### Application Not Starting
```bash
# Check PM2 logs
pm2 logs wise-expense-tracker --err

# Check if port 3000 is in use
netstat -tulpn | grep 3000

# Manually start to see errors
cd ~/wise-expense-tracker
node server.js
```

### nginx Issues
```bash
# Check nginx error logs
tail -f /var/log/nginx/error.log

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew manually
certbot renew --nginx

# Check renewal timer
systemctl status certbot.timer
```

### Connection Refused
- Verify PM2 is running: `pm2 status`
- Check firewall: `ufw status`
- Verify nginx is running: `systemctl status nginx`
- Check domain DNS: `nslookup your_domain.com`

## Critical Files on Server

- **Application:** `/home/wiseapp/wise-expense-tracker/`
- **Environment config:** `/home/wiseapp/wise-expense-tracker/.env`
- **Settings:** `/home/wiseapp/wise-expense-tracker/settings.json`
- **nginx config:** `/etc/nginx/sites-available/wise-expense-tracker`
- **SSL certificates:** `/etc/letsencrypt/live/your_domain.com/`
- **PM2 config:** `/home/wiseapp/.pm2/`

## Security Recommendations

1. **Never commit .env file** - Keep credentials secure
2. **Use strong SSH keys** - Disable password authentication
3. **Keep system updated** - Run `apt update && apt upgrade` regularly
4. **Monitor PM2 logs** - Watch for suspicious activity
5. **Backup settings.json** - Contains date range configuration
6. **Rate limiting** - Consider adding to nginx config for API endpoints
7. **Environment variable security** - Ensure .env has restrictive permissions (600)

## Performance Optimization (Optional)

### nginx Caching for Static Files
Add to nginx config inside `location /` block:
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### PM2 Cluster Mode (Multi-Core)
```bash
pm2 delete wise-expense-tracker
pm2 start server.js --name wise-expense-tracker -i max
pm2 save
```

### Enable Gzip Compression in nginx
Add to nginx config inside `server` block:
```nginx
gzip on;
gzip_types text/css application/javascript application/json;
gzip_min_length 1000;
```

## Implementation Summary

This plan provides a production-ready deployment with:
- ✅ Secure SSL/HTTPS with auto-renewal
- ✅ Reverse proxy with nginx for better performance
- ✅ PM2 process management with auto-restart
- ✅ Git-based deployment workflow
- ✅ Automated deployment script
- ✅ Proper user permissions (non-root)
- ✅ System service integration (starts on boot)
- ✅ Monitoring and logging capabilities

Total setup time: Approximately 30-45 minutes for a fresh droplet.
