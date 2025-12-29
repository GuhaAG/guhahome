# Setup Checklist

Use this checklist to ensure your Wise Expense Tracker is properly configured.

## Prerequisites

- [ ] Node.js installed (v14 or higher)
  - Check: Run `node --version` in terminal
  - Download: https://nodejs.org/

- [ ] Wise account
  - Log in to https://wise.com
  - Have your account ready

## Installation Steps

- [ ] **Step 1**: Install dependencies
  ```bash
  npm install
  ```
  Expected output: List of installed packages (express, axios, dotenv, cors)

- [ ] **Step 2**: Create `.env` file from template
  ```bash
  copy .env.example .env
  ```
  Result: New `.env` file created in project root

- [ ] **Step 3**: Get Wise API Token
  - [ ] Log in to Wise.com
  - [ ] Go to: Settings → API tokens
  - [ ] Click "Add new Token"
  - [ ] Complete 2FA
  - [ ] Copy your API token

- [ ] **Step 4**: Get Wise Profile ID
  - Option A: Check your account settings
  - Option B: Will be shown in app error messages if incorrect

- [ ] **Step 5**: Update `.env` file with your credentials
  ```env
  WISE_ENVIRONMENT=sandbox  # or 'production' for real data
  WISE_API_TOKEN=your_actual_token_here
  WISE_PROFILE_ID=your_actual_profile_id_here
  PORT=3000
  ```

- [ ] **Step 6**: Start the server
  ```bash
  npm start
  ```
  Expected output:
  ```
  🚀 Wise Expense Tracker running at http://localhost:3000
  📊 Environment: sandbox
  ⚙️  Configured: true
  ```

- [ ] **Step 7**: Test the application
  - [ ] Open browser to http://localhost:3000
  - [ ] Page loads without errors
  - [ ] Date fields show default values (last 30 days)
  - [ ] Click "Fetch Transactions"
  - [ ] Transactions load successfully (or appropriate message if none exist)

## Verification Checklist

### Server Status

- [ ] Server starts without errors
- [ ] Console shows "Configured: true"
- [ ] No port conflict errors

### Browser Testing

- [ ] Page loads at http://localhost:3000
- [ ] No console errors in browser DevTools (F12)
- [ ] Date inputs are pre-filled
- [ ] "Fetch Transactions" button is clickable

### API Integration

- [ ] Health check passes (no configuration errors)
- [ ] Transactions fetch successfully OR show appropriate error
- [ ] Daily totals calculate correctly
- [ ] Transactions display in collapsible sections
- [ ] Clicking a day header expands/collapses transactions

### UI Features

- [ ] Summary cards display at top after fetching
- [ ] Each day section is collapsible
- [ ] Transaction amounts formatted as currency
- [ ] Dates formatted in readable format
- [ ] Responsive design works on smaller screens

## Troubleshooting

### ❌ "Server not configured" error

**Issue**: `.env` file missing or incomplete

**Fix**:
1. Ensure `.env` file exists (not `.env.example`)
2. Check that `WISE_API_TOKEN` and `WISE_PROFILE_ID` are filled in
3. Remove any quotes around values
4. Restart the server

### ❌ "Cannot connect to server" in browser

**Issue**: Server not running

**Fix**:
1. Go back to terminal
2. Run `npm start`
3. Wait for "running at http://localhost:3000" message
4. Refresh browser

### ❌ "Invalid API token" (401 error)

**Issue**: Token is incorrect or expired

**Fix**:
1. Generate new token from Wise.com
2. Update `WISE_API_TOKEN` in `.env`
3. Restart server

### ❌ "Access forbidden" (403 error)

**Issue**: Profile ID is incorrect

**Fix**:
1. Verify your profile ID
2. Update `WISE_PROFILE_ID` in `.env`
3. Ensure your API token has permission for this profile
4. Restart server

### ❌ "No transactions found"

**Issue**: No transactions in selected date range

**Fix**:
1. Expand date range
2. Check your Wise account for transactions
3. If using sandbox, create test transactions first
4. Verify you have debit card transactions (not just transfers)

### ❌ Port 3000 already in use

**Issue**: Another app is using port 3000

**Fix**:
1. Change port in `.env`:
   ```env
   PORT=3001
   ```
2. Restart server
3. Open browser to new port: http://localhost:3001

## Testing with Sandbox

If you want to test without real data:

1. Set environment to sandbox:
   ```env
   WISE_ENVIRONMENT=sandbox
   ```

2. Use sandbox API base URL (automatic)

3. Get sandbox credentials from Wise API docs

4. Create test transactions via API or Wise sandbox interface

## Testing with Production

To use real transaction data:

1. Set environment to production:
   ```env
   WISE_ENVIRONMENT=production
   ```

2. Use your real Wise business API token

3. Use your real profile ID

4. **Warning**: This will show actual financial data

## Security Checks

- [ ] `.env` file is NOT committed to git
- [ ] `.gitignore` includes `.env`
- [ ] API token is kept secret (not shared)
- [ ] Server only runs locally (not exposed to internet)

## Success Criteria

You've successfully set up the app when:

✅ Server starts with "Configured: true"
✅ Browser loads the app without errors
✅ Clicking "Fetch Transactions" retrieves data
✅ Daily totals display correctly
✅ Transactions show with proper formatting
✅ Clicking day headers expands/collapses details

## Next Steps

Once setup is complete:

1. **Use the app**: Fetch your transactions and view daily totals
2. **Customize**: Edit `public/styles.css` to change appearance
3. **Extend**: Add features from the future enhancements list
4. **Read docs**: Check TECHNICAL.md for implementation details

## Getting Help

- **Quick setup**: See QUICKSTART.md
- **Full documentation**: See README.md
- **Technical details**: See TECHNICAL.md
- **File overview**: See PROJECT_SUMMARY.md

## Support Resources

- **Wise API Docs**: https://docs.wise.com/api-reference
- **Node.js Docs**: https://nodejs.org/docs/
- **Express Docs**: https://expressjs.com/

---

**Setup Time**: ~10 minutes
**Difficulty**: Beginner-friendly
**Requirements**: Node.js, Wise business account
