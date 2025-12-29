# guha home

Personal website featuring My WISE Tracker - a finance dashboard for tracking Wise debit card expenses.

**IMPORTANT**: This file (README.md) and CLAUDE.md are synchronized and must contain identical content.

## What This Is

- **guha home** - Minimal personal homepage (thermal receipt aesthetic)
- **My WISE Tracker** - Finance page showing daily expense totals from Wise API
- Node.js/Express backend + vanilla JavaScript frontend
- Deployed at https://guhaho.me

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Wise API credentials

# Start server
npm start
# Visit http://localhost:3000
```

## Project Structure

```
public/
  home.html       # Homepage
  finance.html    # My WISE Tracker dashboard
  app.js          # Frontend logic
  styles.css      # Thermal receipt design
server.js         # Express backend + Wise API integration
```

## Configuration (.env)

```env
WISE_ENVIRONMENT=production    # or 'sandbox'
WISE_API_TOKEN=xxx            # Get from Wise.com > Settings > API tokens
WISE_PROFILE_ID=xxx           # Your Wise profile ID
PORT=3000
MOCK_MODE=false               # Set true for testing without API
```

## API Endpoints

- `GET /` → Home page
- `GET /finances` → My WISE Tracker
- `GET /api/health` → Configuration status
- `GET /api/transactions` → Fetch transaction data
- `POST /api/settings` → Update date range
- `POST /api/resync` → Refresh cached data

## Tech Stack

- **Backend**: Node.js, Express, Axios
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Design**: Thermal receipt aesthetic with IBM Plex Mono, Crimson Pro, DM Sans
- **Deployment**: Digital Ocean, nginx, PM2, Let's Encrypt SSL

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment guide.

Quick deploy:
```bash
git push origin main
ssh guha@your-droplet "cd ~/guha-home && ./deploy.sh"
```

## Development Notes

- 2-space indentation
- ES6+ features (async/await, arrow functions, template literals)
- No build process or TypeScript
- No database - data fetched live from Wise API
- Settings persisted in `settings.json` file
