# Deployment Guide - guha home

Complete guide for deploying guha home to Digital Ocean with automated setup.

## What You're Deploying

**guha home** - Your personal website featuring:
- Homepage with minimal design aesthetic
- My WISE Tracker - Finance dashboard for tracking Wise debit card expenses
- Thermal receipt-inspired design with warm, paper-like aesthetic

---

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Digital Ocean account ([sign up here](https://www.digitalocean.com/))
- [ ] Domain name with access to DNS settings
- [ ] Git repository with this code (GitHub, GitLab, etc.)
- [ ] Wise API credentials:
  - [ ] API Token (get from Wise.com > Settings > Integrations)
  - [ ] Profile ID (found in your Wise account)
- [ ] SSH key (optional but recommended - [generate one](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent))

---

## Part 1: Create Digital Ocean Droplet (5 minutes)

### Step 1: Log into Digital Ocean
1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com/)
2. Click the green "Create" button in the top right
3. Select "Droplets"

### Step 2: Configure Your Droplet

**Choose an image:**
- Select **Ubuntu 24.04 (LTS) x64** (or latest Ubuntu version)

**Choose a plan:**
- Select **Basic** plan
- CPU option: **Regular**
- Size: **$6/month** (1GB RAM, 25GB SSD) - Perfect for this app

**Choose a datacenter region:**
- Select the region closest to you or your users
- Example: New York, San Francisco, London, etc.

**Authentication:**
- **Option A (Recommended):** Upload your SSH public key
  - Click "New SSH Key"
  - Paste your public key (from `~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`)
  - Give it a name like "my-laptop"
- **Option B:** Use a password
  - Digital Ocean will email you the root password

**Finalize details:**
- **Hostname:** `guha-home`
- **Tags:** (optional) Add tags like "production" or "personal"
- Leave other options as default

### Step 3: Create Droplet
1. Click the green "Create Droplet" button
2. Wait ~60 seconds for the droplet to be created
3. **Copy the droplet's IP address** - you'll need this! (looks like: 142.93.XXX.XXX)

---

## Part 2: Configure DNS (2 minutes + wait time)

### Step 1: Access Your Domain's DNS Settings
Go to your domain registrar (where you bought the domain):
- GoDaddy, Namecheap, Cloudflare, Google Domains, etc.
- Find the DNS management or DNS settings page

### Step 2: Add an A Record
Create a new DNS record with these settings:

| Field | Value |
|-------|-------|
| **Type** | A |
| **Host/Name** | @ (for root domain) or subdomain (like "guha") |
| **Value/Points to** | Your droplet IP address |
| **TTL** | 3600 or Automatic |

**Examples:**
- `@` → Site will be at `yourdomain.com`
- `guha` → Site will be at `guha.yourdomain.com`
- `home` → Site will be at `home.yourdomain.com`

### Step 3: Wait for DNS Propagation
- DNS changes can take 5-60 minutes to propagate
- You can continue to the next step while waiting
- Check propagation: `nslookup your-domain.com` (should show your droplet IP)

---

## Part 3: Prepare Your Repository (2 minutes)

### Option A: Already Have a Git Repository
If your code is already on GitHub/GitLab/etc., you're all set! Just have the repository URL ready.

### Option B: Need to Create a Repository
```bash
# Initialize git (if not already done)
cd /path/to/findash
git init

# Create a repository on GitHub/GitLab

# Add remote and push
git remote add origin <your-repo-url>
git add .
git commit -m "initial commit for deployment"
git push -u origin main
```

**Important:** Make sure `.env` is in `.gitignore` (it already is) - never commit credentials!

---

## Part 4: Run Automated Deployment (10-15 minutes)

### Step 1: Run the Deployment Script
From your local machine, in the project directory:

```bash
./do-setup.sh
```

### Step 2: Answer the Prompts
The script will ask you for:

1. **Droplet IP address:** `142.93.XXX.XXX` (from Part 1)
2. **Domain name:** `guha.yourdomain.com` (what you configured in DNS)
3. **Git repository URL:** `https://github.com/yourusername/yourrepo.git`
4. **Wise API token:** Your personal API token from Wise
5. **Wise profile ID:** Your Wise profile ID
6. **Wise environment:** `production` (or `sandbox` for testing)

### Step 3: Watch the Magic Happen
The script will automatically:
- ✅ Connect to your droplet via SSH
- ✅ Update system packages
- ✅ Install Node.js 20.x
- ✅ Install nginx, PM2, git, certbot
- ✅ Create a dedicated "guha" user
- ✅ Clone your repository
- ✅ Install npm dependencies
- ✅ Configure environment variables
- ✅ Start the app with PM2
- ✅ Configure nginx reverse proxy
- ✅ Set up SSL certificate (Let's Encrypt)
- ✅ Configure firewall

**Note:** You may be prompted to accept the SSH fingerprint - type `yes` and press Enter.

### Step 4: Completion
When you see:
```
==========================================
✓ ALL DONE!
==========================================

Visit your app at: https://your-domain.com
```

You're deployed! 🎉

---

## Part 5: Verify Your Deployment (2 minutes)

### Test Your Site
1. Open your browser and go to `https://your-domain.com`
2. You should see the **guha home** page with minimal design
3. Click the "findash" link
4. You should see **My WISE Tracker** dashboard
5. Test the settings modal and date range selector
6. Try loading some transactions

### Check Application Status
SSH into your droplet:
```bash
ssh guha@your-droplet-ip
pm2 status
```

You should see:
```
┌─────┬────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ status  │ restart │ uptime  │ cpu      │
├─────┼────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ guha-home  │ online  │ 0       │ 5m      │ 0%       │
└─────┴────────────┴─────────┴─────────┴─────────┴──────────┘
```

### View Logs
```bash
pm2 logs guha-home
```

Press `Ctrl+C` to exit the logs.

---

## Part 6: Set Up Deployment Script (3 minutes)

For future updates, you'll want a simple deployment command.

### SSH into Your Droplet
```bash
ssh guha@your-droplet-ip
cd ~/guha-home
```

### Create the Deployment Script
```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying updates to guha home..."

# Pull latest code
git pull origin main

# Install any new dependencies
npm install --production

# Restart app
pm2 restart guha-home

echo "✓ Deployment complete!"
pm2 status
pm2 logs guha-home --lines 20
EOF

chmod +x deploy.sh
```

### Test It
```bash
./deploy.sh
```

You should see the deployment process run and the app restart.

---

## Daily Operations

### Deploying Code Updates

Whenever you make changes and want to deploy:

```bash
# On your local machine:
git add .
git commit -m "your changes"
git push origin main

# On the server (via SSH):
ssh guha@your-droplet-ip
cd ~/guha-home
./deploy.sh
```

### Managing the Application

```bash
# SSH into server
ssh guha@your-droplet-ip

# Check status
pm2 status

# View real-time logs
pm2 logs guha-home

# View last 100 log lines
pm2 logs guha-home --lines 100

# Restart application
pm2 restart guha-home

# Stop application
pm2 stop guha-home

# Start application (if stopped)
pm2 start guha-home
```

### Updating Environment Variables

```bash
ssh guha@your-droplet-ip
cd ~/guha-home
nano .env  # Edit your environment variables
pm2 restart guha-home  # Restart to apply changes
```

### Updating Settings (Date Range)

The app stores date range settings in `settings.json`:

```bash
ssh guha@your-droplet-ip
cd ~/guha-home
nano settings.json  # Edit date range
pm2 restart guha-home  # Restart to apply
```

Or just use the settings modal in the web UI!

### Checking nginx Status

```bash
ssh root@your-droplet-ip
systemctl status nginx
```

### Viewing nginx Logs

```bash
ssh root@your-droplet-ip
tail -f /var/log/nginx/access.log  # Access logs
tail -f /var/log/nginx/error.log   # Error logs
```

---

## Troubleshooting

### Can't SSH into Droplet

**Problem:** `ssh: connect to host XXX.XXX.XXX.XXX port 22: Connection refused`

**Solutions:**
- Verify the IP address is correct
- If using SSH key, make sure it was added during droplet creation
- Try: `ssh -i ~/.ssh/id_rsa root@your-droplet-ip`
- Check Digital Ocean console for the droplet status

### SSL Certificate Failed to Set Up

**Problem:** You see "⚠ SSL setup will be done manually"

**Solution:** Run certbot manually after deployment:
```bash
ssh root@your-droplet-ip
certbot --nginx -d your-domain.com
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose to redirect HTTP to HTTPS (option 2)

### Domain Not Loading

**Problem:** Browser shows "Site can't be reached"

**Solutions:**
1. **DNS not propagated yet:** Wait 10-30 more minutes
2. **Check DNS:** `nslookup your-domain.com` (should show droplet IP)
3. **Try IP directly:** Visit `http://your-droplet-ip:3000` to test if app is running
4. **Check nginx:** `ssh root@your-droplet-ip` then `systemctl status nginx`
5. **Check firewall:** `ssh root@your-droplet-ip` then `ufw status` (should allow Nginx Full)

### App Not Loading / 502 Bad Gateway

**Problem:** Domain loads but shows nginx error

**Solutions:**
```bash
# Check if app is running
ssh guha@your-droplet-ip
pm2 status  # Should show "online"

# Check app logs for errors
pm2 logs guha-home --err

# Restart the app
pm2 restart guha-home

# If app keeps crashing, check for errors
pm2 logs guha-home --lines 100
```

### 401/403 Errors from Wise API

**Problem:** Transactions fail to load, getting authentication errors

**Solutions:**
1. **Verify token:** Check `.env` file has correct `WISE_API_TOKEN`
   ```bash
   ssh guha@your-droplet-ip
   cd ~/guha-home
   cat .env  # Verify WISE_API_TOKEN is correct
   ```

2. **Check environment:** Ensure `WISE_ENVIRONMENT` matches your token type
   - Sandbox token → `WISE_ENVIRONMENT=sandbox`
   - Production token → `WISE_ENVIRONMENT=production`

3. **Token expired:** Generate a new API token in Wise dashboard

4. **Update and restart:**
   ```bash
   nano .env  # Update the token
   pm2 restart guha-home
   ```

### SSL Certificate About to Expire

**Problem:** You get an email about SSL expiring

**Note:** Let's Encrypt certificates auto-renew! But if you need to renew manually:

```bash
ssh root@your-droplet-ip
certbot renew
systemctl reload nginx
```

Test auto-renewal:
```bash
certbot renew --dry-run
```

---

## Critical Files Reference

### On the Server

| File/Directory | Path | Purpose |
|----------------|------|---------|
| Application | `/home/guha/guha-home/` | Your app code |
| Environment config | `/home/guha/guha-home/.env` | API tokens, settings |
| Settings file | `/home/guha/guha-home/.env/settings.json` | Date range config |
| Deployment script | `/home/guha/guha-home/deploy.sh` | Update script |
| nginx config | `/etc/nginx/sites-available/guha-home` | Web server config |
| nginx logs | `/var/log/nginx/` | Access & error logs |
| SSL certificates | `/etc/letsencrypt/live/your-domain.com/` | HTTPS certificates |
| PM2 config | `/home/guha/.pm2/` | Process manager data |

### Environment Variables (.env)

```bash
WISE_ENVIRONMENT=production    # or 'sandbox' for testing
WISE_API_TOKEN=xxx            # Your Wise API token
WISE_PROFILE_ID=xxx           # Your Wise profile ID
PORT=3000                      # Server port (don't change)
MOCK_MODE=false               # Set to 'true' to use fake data
```

---

## Security Best Practices

### ✅ Already Configured
- Non-root user (`guha`) runs the application
- UFW firewall enabled (only SSH, HTTP, HTTPS allowed)
- SSL/HTTPS enforced with auto-renewal
- `.env` file not committed to git

### 🔒 Additional Recommendations

1. **Disable root login via password:**
   ```bash
   ssh root@your-droplet-ip
   nano /etc/ssh/sshd_config
   # Set: PermitRootLogin without-password
   systemctl restart sshd
   ```

2. **Regular system updates:**
   ```bash
   ssh root@your-droplet-ip
   apt update && apt upgrade -y
   ```

3. **Monitor PM2 logs regularly:**
   ```bash
   ssh guha@your-droplet-ip
   pm2 logs guha-home
   ```

4. **Backup your settings:**
   ```bash
   # From local machine
   scp guha@your-droplet-ip:~/guha-home/settings.json ./settings.backup.json
   ```

5. **Keep API token secure:**
   - Never share your `.env` file
   - Rotate API tokens periodically
   - Use production tokens only on production server

---

## Performance Tips

### Enable nginx Caching (Optional)

```bash
ssh root@your-droplet-ip
nano /etc/nginx/sites-available/guha-home
```

Add inside the `server` block:
```nginx
# Cache static files
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Enable gzip compression
gzip on;
gzip_types text/css application/javascript application/json;
gzip_min_length 1000;
```

Reload nginx:
```bash
systemctl reload nginx
```

### Enable PM2 Cluster Mode (Optional)

For better performance on multi-core servers:
```bash
ssh guha@your-droplet-ip
pm2 delete guha-home
pm2 start server.js --name guha-home -i max
pm2 save
```

---

## Cost Breakdown

### Digital Ocean Droplet
- **Basic Plan:** $6/month (1GB RAM, 25GB SSD, 1TB transfer)
- Sufficient for personal use and moderate traffic

### Domain Name
- **Cost varies:** $10-15/year (depending on registrar and TLD)
- You already have this

### SSL Certificate
- **Let's Encrypt:** FREE (automatically renewed)

### Total Monthly Cost: ~$6/month

---

## Getting Help

### Check Documentation
- This file: `DEPLOYMENT.md`
- Project overview: `CLAUDE.md` / `README.md`
- Technical details: `docs/TECHNICAL.md`
- Full deployment options: `docs/CLOUD_DEPLOYMENT.md`

### Common Commands Quick Reference
```bash
# Check app status
ssh guha@your-droplet-ip pm2 status

# View logs
ssh guha@your-droplet-ip pm2 logs guha-home

# Deploy updates
ssh guha@your-droplet-ip "cd ~/guha-home && ./deploy.sh"

# Restart app
ssh guha@your-droplet-ip pm2 restart guha-home
```

### Digital Ocean Resources
- [Digital Ocean Docs](https://docs.digitalocean.com/)
- [Community Tutorials](https://www.digitalocean.com/community/tutorials)
- [Support Center](https://www.digitalocean.com/support/)

---

## Summary

You now have:
- ✅ Production-ready deployment on Digital Ocean
- ✅ HTTPS with auto-renewing SSL certificate
- ✅ Automated deployments via simple script
- ✅ Process management with PM2 (auto-restart, boot startup)
- ✅ Reverse proxy with nginx
- ✅ Proper security configuration
- ✅ Easy maintenance and monitoring

**To deploy updates in the future:**
```bash
git push origin main
ssh guha@your-droplet-ip "cd ~/guha-home && ./deploy.sh"
```

That's it! Your guha home is now live on the internet. 🎉
