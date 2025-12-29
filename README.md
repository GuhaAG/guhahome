# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT SYNCHRONIZATION RULE**: This file (CLAUDE.md) and README.md must always contain identical content. Whenever CLAUDE.md is updated, README.md must be updated with the same content to keep them synchronized.

## Project Overview

This is the Wise Expense Tracker - a Node.js/Express web application that fetches and displays daily expense totals from Wise debit card transactions via the Wise API. The app runs locally and provides a clean interface for tracking spending patterns.

## Development Commands

```bash
# Install dependencies
npm install

# Start the server (runs on port 3000 by default)
npm start

# Development mode (same as npm start currently)
npm run dev
```

## Architecture

### Backend (server.js)
- Express server handling Wise API integration
- Bearer token authentication with Wise API
- Two main endpoints:
  - `GET /api/health` - Configuration status check
  - `GET /api/transactions?intervalStart={iso}&intervalEnd={iso}` - Fetch and process transactions
- Transaction processing: Fetches balances → Retrieves statements → Filters expenses → Groups by day → Returns formatted data

### Frontend (public/)
- **index.html**: Main UI structure with date pickers and results container
- **app.js**: Handles API calls, data rendering, date formatting, and UI interactions
- **styles.css**: Purple gradient theme with responsive design

### Data Flow
1. User selects date range → Frontend calls `/api/transactions`
2. Backend fetches from Wise API:
   - `/v4/profiles/{profileId}/balances` (get balance ID)
   - `/v1/profiles/{profileId}/balance-statements/{balanceId}/statement.json` (get transactions)
3. Backend processes: filters expenses (negative amounts) → groups by day → calculates totals
4. Frontend renders: summary stats → collapsible daily sections with transaction details

## Configuration

Environment variables (.env):
- `WISE_ENVIRONMENT`: 'sandbox' or 'production'
- `WISE_API_TOKEN`: Personal API token from Wise
- `WISE_PROFILE_ID`: User's Wise profile ID
- `PORT`: Server port (default 3000)

## Key Implementation Details

### API Integration
- Base URLs: Sandbox (`api.sandbox.transferwise.tech`) or Production (`api.wise.com`)
- Authentication: Bearer token in Authorization header
- Only fetches first currency balance found
- Filters for expense transactions (negative amounts)

### Frontend Patterns
- Vanilla JavaScript (no frameworks)
- Date handling via native Date objects and toISOString()
- Dynamic rendering with template literals
- Collapsible sections for daily transaction details

### Code Style
- 2-space indentation
- ES6+ features (const/let, arrow functions, async/await)
- Inline comments for complex logic
- No TypeScript, no build process

## Common Development Tasks

### Adding New API Endpoints
Add route in server.js following existing pattern:
```javascript
app.get('/api/new-endpoint', async (req, res) => {
  // Validate configuration
  // Make Wise API calls
  // Process data
  // Return JSON response
});
```

### Modifying Transaction Processing
Edit the `/api/transactions` endpoint in server.js:
- Transaction filtering logic is in the forEach loop
- Daily totals calculation happens during iteration
- Response format is defined at the end

### UI Changes
- Structure: Edit public/index.html
- Styling: Edit public/styles.css (uses CSS custom properties for colors)
- Logic: Edit public/app.js (renderSummary() and renderDailyTotals() functions)

## Testing Approach
No formal test framework configured. Manual testing process:
1. Start server with `npm start`
2. Navigate to `http://localhost:3000`
3. Use browser DevTools for debugging (F12)
4. Check server console for backend errors

## Important Notes
- No linting or formatting tools configured
- No automated tests
- No database - all data fetched live from Wise API
- Runs locally only (not production deployment ready)
- Single currency support only (uses first balance)