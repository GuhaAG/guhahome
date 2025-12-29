# Quick Start Guide

Get up and running with Wise Expense Tracker in 5 minutes!

## Step 1: Install Node.js

If you don't have Node.js installed:
1. Download from https://nodejs.org/
2. Install the LTS (Long Term Support) version
3. Verify installation: `node --version`

## Step 2: Install Dependencies

Open a terminal in this directory and run:

```bash
npm install
```

## Step 3: Get Your Wise API Credentials

### For Your Wise Account:

1. Log in to [Wise.com](https://wise.com)
2. Go to: **Settings** → **API tokens**
3. Click **Add new Token** (requires 2FA)
4. Copy your token immediately (it won't be shown again!)
5. Find your Profile ID (you can call the `/v2/profiles` endpoint or check your account settings)

### For Testing (Optional):

If you want to test without real data first:
1. Visit the [Wise API Sandbox documentation](https://docs.wise.com/guides/developer/sandbox-and-production)
2. Follow their instructions to get sandbox credentials
3. Use these in your `.env` file with `WISE_ENVIRONMENT=sandbox`

## Step 4: Configure Your Environment

1. Copy the example file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   WISE_ENVIRONMENT=sandbox
   WISE_API_TOKEN=your_token_here
   WISE_PROFILE_ID=your_profile_id_here
   PORT=3000
   ```

## Step 5: Start the Server

```bash
npm start
```

You should see:
```
🚀 Wise Expense Tracker running at http://localhost:3000
📊 Environment: sandbox
⚙️  Configured: true
```

## Step 6: Open the App

1. Open your browser
2. Go to: `http://localhost:3000`
3. Select your date range
4. Click "Fetch Transactions"
5. View your daily expense totals!

## Common Issues

**"Server not configured" warning?**
- Check your `.env` file exists and has valid values

**No transactions showing?**
- Make sure you have transactions in that date range
- If using sandbox, you may need to create test data first

**Port 3000 already in use?**
- Change `PORT=3000` to another number in `.env`
- Or stop the application using that port

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out the [Wise API docs](https://docs.wise.com/api-reference) for more capabilities
- Customize the frontend styling in `public/styles.css`

## Need Help?

Check the **Troubleshooting** section in [README.md](README.md)
