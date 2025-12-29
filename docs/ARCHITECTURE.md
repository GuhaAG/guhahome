# Architecture & Data Flow

Visual guide to how the Wise Expense Tracker works.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (http://localhost:3000)                     │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │  index.html  │  │  styles.css  │  │   app.js   │ │   │
│  │  │              │  │              │  │            │ │   │
│  │  │  • UI        │  │  • Styling   │  │  • Logic   │ │   │
│  │  │  • Forms     │  │  • Layout    │  │  • API     │ │   │
│  │  │  • Display   │  │  • Themes    │  │  • Render  │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Requests
                         │ (GET /api/transactions)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Express Server                      │
│                     (Port 3000)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  server.js                                            │   │
│  │                                                        │   │
│  │  Routes:                                              │   │
│  │  • GET /api/health    - Health check                 │   │
│  │  • GET /api/transactions - Fetch & process data      │   │
│  │  • GET /             - Serve frontend                │   │
│  │                                                        │   │
│  │  Middleware:                                          │   │
│  │  • CORS - Allow cross-origin requests                │   │
│  │  • Express.json - Parse JSON bodies                  │   │
│  │  • Express.static - Serve static files               │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS Requests
                         │ (Bearer Token Auth)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Wise API                                │
│         (api.wise.com or sandbox)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Endpoints Used:                                      │   │
│  │                                                        │   │
│  │  GET /v4/profiles/{id}/balances                       │   │
│  │  → Returns list of currency balances                 │   │
│  │                                                        │   │
│  │  GET /v1/profiles/{id}/balance-statements/           │   │
│  │      {balanceId}/statement.json                       │   │
│  │  → Returns transaction history                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Interaction

```
User opens browser
    ↓
Loads http://localhost:3000
    ↓
Frontend (index.html + app.js) loads
    ↓
app.js calls GET /api/health
    ↓
Checks if server is configured
    ↓
User selects date range
    ↓
User clicks "Fetch Transactions"
```

### 2. API Request Flow

```
app.js → fetchTransactions()
    ↓
Constructs URL with date parameters:
/api/transactions?intervalStart=...&intervalEnd=...
    ↓
Sends GET request to backend
    ↓
server.js receives request
```

### 3. Backend Processing

```
server.js → /api/transactions handler
    ↓
Step 1: Validate configuration
    • Check WISE_API_TOKEN exists
    • Check WISE_PROFILE_ID exists
    ↓
Step 2: Fetch balances from Wise
    • GET /v4/profiles/{id}/balances?types=STANDARD
    • Extract first balance ID
    ↓
Step 3: Fetch statement from Wise
    • GET /v1/profiles/{id}/balance-statements/{balanceId}/statement.json
    • Pass intervalStart, intervalEnd, type=COMPACT
    ↓
Step 4: Process transactions
    • Filter: amount.value < 0 (expenses only)
    • Transform: Convert to app format
    • Sort: Most recent first
    ↓
Step 5: Calculate daily totals
    • Group by date (YYYY-MM-DD)
    • Sum amounts per day
    • Count transactions per day
    ↓
Step 6: Format response
    • Build JSON with transactions, dailyTotals, period, currency
    ↓
Step 7: Send response to frontend
```

### 4. Frontend Rendering

```
app.js receives response
    ↓
renderSummary(data)
    • Calculate total expenses
    • Calculate total transactions
    • Count active days
    • Update summary cards
    ↓
renderDailyTotals(data)
    • Sort dates (newest first)
    • Create day sections
    • Add transaction details
    • Make sections collapsible
    ↓
Display to user
```

## Authentication Flow

```
1. User generates API token in Wise account
   → Copies to .env file

2. Server loads token on startup
   → process.env.WISE_API_TOKEN

3. Server makes API request
   → Adds header: Authorization: Bearer {token}

4. Wise validates token
   → Returns data if valid
   → Returns 401 if invalid
```

## Data Transformation

### Wise API Response → App Format

```javascript
// Wise API Transaction (raw)
{
  "referenceNumber": "TRANSFER-123456",
  "date": "2025-12-29T10:30:00.000Z",
  "amount": {
    "value": -25.50,        // Negative = debit
    "currency": "USD"
  },
  "runningBalance": {
    "value": 1500.00
  },
  "details": {
    "type": "CARD",
    "description": "Coffee Shop Purchase"
  }
}

// ↓ Transformed to ↓

// App Transaction (processed)
{
  "id": "TRANSFER-123456",
  "date": "2025-12-29T10:30:00.000Z",
  "description": "Coffee Shop Purchase",
  "amount": 25.50,          // Positive for display
  "currency": "USD",
  "type": "CARD",
  "runningBalance": 1500.00
}
```

### Transactions → Daily Totals

```javascript
// Input: Array of transactions
[
  { date: "2025-12-29T10:30:00Z", amount: 25.50, ... },
  { date: "2025-12-29T14:20:00Z", amount: 12.00, ... },
  { date: "2025-12-28T09:15:00Z", amount: 45.75, ... }
]

// ↓ Grouped by date ↓

// Output: Daily totals object
{
  "2025-12-29": {
    "total": 37.50,         // 25.50 + 12.00
    "count": 2,
    "currency": "USD",
    "transactions": [...]
  },
  "2025-12-28": {
    "total": 45.75,
    "count": 1,
    "currency": "USD",
    "transactions": [...]
  }
}
```

## Component Interaction

### Backend Components

```
┌─────────────┐
│  server.js  │
└──────┬──────┘
       │
       ├─→ Express Router
       │   ├─→ /api/health
       │   ├─→ /api/transactions
       │   └─→ / (static files)
       │
       ├─→ Middleware
       │   ├─→ cors()
       │   ├─→ express.json()
       │   └─→ express.static('public')
       │
       └─→ Wise API Client (axios)
           ├─→ GET balances
           └─→ GET statement
```

### Frontend Components

```
┌──────────────┐
│  index.html  │ ← Main structure
└──────┬───────┘
       │
       ├─→ Date inputs (startDate, endDate)
       ├─→ Fetch button
       ├─→ Status display
       ├─→ Summary cards
       └─→ Daily totals container
           └─→ Day sections (dynamically created)
               └─→ Transactions (dynamically created)

┌──────────────┐
│  styles.css  │ ← Styling
└──────┬───────┘
       │
       ├─→ Layout (flexbox, grid)
       ├─→ Theme (gradient, colors)
       ├─→ Components (cards, buttons)
       └─→ Responsive (@media queries)

┌──────────────┐
│   app.js     │ ← Logic
└──────┬───────┘
       │
       ├─→ fetchTransactions() - Main fetch logic
       ├─→ renderSummary() - Render stats
       ├─→ renderDailyTotals() - Render days
       ├─→ renderTransactions() - Render items
       ├─→ toggleDay() - Expand/collapse
       └─→ Utility functions (format, display)
```

## Error Handling Flow

```
Frontend Request
    ↓
Try-Catch Block
    ↓
    ├─→ Success Path
    │   ├─→ Process data
    │   ├─→ Render UI
    │   └─→ Show success message
    │
    └─→ Error Path
        ↓
        Check error type:
        ├─→ 401 Unauthorized
        │   └─→ "Invalid API token"
        │
        ├─→ 403 Forbidden
        │   └─→ "Access forbidden - check profile ID"
        │
        ├─→ 500 Server Error
        │   └─→ "Failed to fetch transactions"
        │
        └─→ Network Error
            └─→ "Cannot connect to server"
        ↓
        Display error message
        ↓
        Show empty state with error info
```

## State Management

### Frontend State

```
┌─────────────────────────────────┐
│  DOM-based State                 │
├─────────────────────────────────┤
│                                  │
│  Button State:                   │
│  • enabled / disabled            │
│  • "Fetch" / "Fetching..."       │
│                                  │
│  Status State:                   │
│  • hidden                        │
│  • loading (blue)                │
│  • success (green)               │
│  • error (red)                   │
│                                  │
│  Summary State:                  │
│  • display: none                 │
│  • display: grid (after fetch)   │
│                                  │
│  Day Section State:              │
│  • collapsed (display: none)     │
│  • expanded (display: block)     │
│                                  │
└─────────────────────────────────┘
```

### Backend State

```
┌─────────────────────────────────┐
│  Server State                    │
├─────────────────────────────────┤
│                                  │
│  Environment Variables:          │
│  • WISE_API_TOKEN                │
│  • WISE_PROFILE_ID               │
│  • WISE_ENVIRONMENT              │
│  • PORT                          │
│                                  │
│  Runtime State:                  │
│  • Server running (boolean)      │
│  • Configuration valid (boolean) │
│                                  │
└─────────────────────────────────┘

Note: Server is stateless - no session storage
Each request is independent
```

## Security Architecture

```
┌─────────────┐
│   .env      │  ← Credentials stored here
└──────┬──────┘
       │ (loaded by dotenv)
       ↓
┌─────────────┐
│  server.js  │  ← Credentials accessed here
└──────┬──────┘
       │ (never sent to frontend)
       │
       ├─→ Frontend sees:
       │   • No API token
       │   • No profile ID
       │   • Only processed data
       │
       └─→ Wise API sees:
           • Valid bearer token
           • Authorized requests
           • HTTPS encrypted

Security Boundaries:
├─→ Frontend: Untrusted zone (browser)
├─→ Backend: Trusted zone (local server)
└─→ .env: Secret storage (not in git)
```

## Performance Characteristics

```
Latency Breakdown:
├─→ Frontend → Backend: ~1-5ms (local)
├─→ Backend → Wise API: ~200-500ms (network)
├─→ Data Processing: ~10-50ms (depends on transaction count)
└─→ Frontend Rendering: ~10-100ms (depends on transaction count)

Total: ~250-650ms typical response time

Bottlenecks:
├─→ Network latency to Wise API (biggest)
├─→ DOM manipulation for large datasets
└─→ No caching (every request hits Wise API)
```

## Deployment Model

```
Current: Local Development
┌──────────────────────┐
│  User's Computer     │
│  ┌────────────────┐  │
│  │  Browser       │  │
│  │  localhost:3000│  │
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼───────┐  │
│  │  Node Server   │  │
│  │  Port 3000     │  │
│  └────────┬───────┘  │
│           │          │
│           └──→ Internet ──→ Wise API
│                      │
└──────────────────────┘

Future: Cloud Deployment
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│   Browser    │ ←→  │ Cloud Server │ ←→  │ Wise API │
│   (Public)   │     │   (Heroku,   │     │          │
└──────────────┘     │    AWS, etc) │     └──────────┘
                     └──────────────┘
```

## File Dependencies

```
server.js
├─ require('dotenv')        → .env
├─ require('express')       → node_modules/express
├─ require('cors')          → node_modules/cors
├─ require('axios')         → node_modules/axios
└─ express.static('public') → public/

index.html
├─ <link> styles.css        → public/styles.css
└─ <script> app.js          → public/app.js

app.js
└─ fetch(API_BASE_URL)      → http://localhost:3000/api/*

package.json
└─ npm install              → creates node_modules/
```

## Request/Response Examples

### Health Check

```http
GET /api/health HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "ok",
  "configured": true,
  "environment": "sandbox"
}
```

### Fetch Transactions

```http
GET /api/transactions?intervalStart=2025-12-01T00:00:00.000Z&intervalEnd=2025-12-29T23:59:59.999Z HTTP/1.1
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json

{
  "transactions": [...],
  "dailyTotals": {...},
  "period": {...},
  "currency": "USD"
}
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Secure credential handling
- ✅ Simple, understandable flow
- ✅ Easy to debug and extend
