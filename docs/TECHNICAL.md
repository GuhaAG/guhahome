# Technical Documentation

Detailed technical information about the Wise Expense Tracker implementation.

## Architecture Overview

```
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Browser   │ ◄──────► │   Express   │ ◄──────► │  Wise API   │
│  (Frontend) │   HTTP   │  (Backend)  │   HTTPS  │             │
└─────────────┘          └─────────────┘          └─────────────┘
```

### Design Principles

1. **Separation of Concerns**: Backend handles API authentication and data processing; frontend handles presentation
2. **Security First**: API credentials never exposed to the browser
3. **Simple Stack**: No build tools, bundlers, or frameworks - just vanilla JS
4. **Progressive Enhancement**: Works without JavaScript for basic HTML

## Backend (server.js)

### Dependencies

- **express** (^4.18.2): Web server framework
- **dotenv** (^16.3.1): Environment variable loader
- **axios** (^1.6.2): Promise-based HTTP client
- **cors** (^2.8.5): Cross-Origin Resource Sharing middleware

### API Endpoints

#### `GET /api/health`

**Purpose**: Health check and configuration verification

**Implementation**:
```javascript
app.get('/api/health', (req, res) => {
  const isConfigured = !!(WISE_API_TOKEN && WISE_PROFILE_ID);
  res.json({
    status: 'ok',
    configured: isConfigured,
    environment: process.env.WISE_ENVIRONMENT || 'sandbox'
  });
});
```

**Response Schema**:
```typescript
{
  status: 'ok',
  configured: boolean,
  environment: 'sandbox' | 'production'
}
```

#### `GET /api/transactions`

**Purpose**: Fetch and process Wise transactions

**Query Parameters**:
- `intervalStart` (ISO 8601 string, optional): Start date for transactions
- `intervalEnd` (ISO 8601 string, optional): End date for transactions

**Process Flow**:

1. **Validate Configuration**
   ```javascript
   if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
     return res.status(500).json({ error: 'Not configured' });
   }
   ```

2. **Fetch Balances** (Wise API v4)
   ```javascript
   GET /v4/profiles/{profileId}/balances?types=STANDARD
   Headers: { Authorization: 'Bearer {token}' }
   ```

3. **Fetch Statement** (Wise API v1)
   ```javascript
   GET /v1/profiles/{profileId}/balance-statements/{balanceId}/statement.json
   Params: { intervalStart, intervalEnd, type: 'COMPACT' }
   ```

4. **Filter Expenses**
   - Only transactions with `amount.value < 0` (debits)
   - Convert to positive amounts for display

5. **Calculate Daily Totals**
   ```javascript
   const dailyTotals = expenses.reduce((acc, txn) => {
     const date = txn.date.split('T')[0];
     if (!acc[date]) {
       acc[date] = { total: 0, count: 0, currency: txn.currency, transactions: [] };
     }
     acc[date].total += txn.amount;
     acc[date].count += 1;
     acc[date].transactions.push(txn);
     return acc;
   }, {});
   ```

6. **Return Processed Data**

**Response Schema**:
```typescript
{
  transactions: Array<{
    id: string,
    date: string,           // ISO 8601
    description: string,
    amount: number,         // Positive value
    currency: string,       // e.g., "USD"
    type: string,          // e.g., "CARD"
    runningBalance: number
  }>,
  dailyTotals: {
    [date: string]: {
      total: number,
      count: number,
      currency: string,
      transactions: Transaction[]
    }
  },
  period: {
    start: string,
    end: string
  },
  currency: string
}
```

**Error Handling**:
- 401: Invalid API token
- 403: Access forbidden (wrong profile ID or insufficient permissions)
- 500: Server error or Wise API error

### Environment Configuration

Loaded from `.env` file via `dotenv`:

```javascript
const WISE_BASE_URL = process.env.WISE_ENVIRONMENT === 'production'
  ? 'https://api.wise.com'
  : 'https://api.sandbox.transferwise.tech';

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
```

## Frontend

### File Structure

- **index.html**: Main HTML structure
- **styles.css**: All styling (no CSS frameworks)
- **app.js**: Frontend logic (vanilla JavaScript, no frameworks)

### Key Functions (app.js)

#### `initializeDateInputs()`

Sets default date range to last 30 days:

```javascript
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);

endDateInput.valueAsDate = today;
startDateInput.valueAsDate = thirtyDaysAgo;
```

#### `fetchTransactions()`

Main function to fetch and display data:

1. Validates date inputs
2. Disables UI during fetch
3. Calls backend API
4. Processes response
5. Updates UI with results
6. Handles errors gracefully

**Error Handling**:
```javascript
try {
  const response = await fetch(`${API_BASE_URL}/api/transactions?...`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  // ... process data
} catch (error) {
  showStatus(`Error: ${error.message}`, 'error');
  // Show empty state with error
}
```

#### `renderDailyTotals(data)`

Renders the daily expense sections:

1. Sorts dates in descending order (most recent first)
2. Creates collapsible sections for each day
3. Embeds transaction details within each day
4. Uses inline `onclick` for toggle functionality

#### `renderTransactions(transactions, currency)`

Renders individual transaction cards:

```javascript
transactions.map(txn => `
  <div class="transaction">
    <div class="transaction-details">
      <div class="transaction-description">${txn.description}</div>
      <div class="transaction-meta">${formatTime(txn.date)} • ${txn.type}</div>
    </div>
    <div class="transaction-amount">${formatCurrency(txn.amount, currency)}</div>
  </div>
`).join('');
```

#### `toggleDay(date)`

Toggle visibility of transactions for a specific day:

```javascript
function toggleDay(date) {
  const dayElement = document.getElementById(`day-${date}`);
  dayElement.style.display =
    dayElement.style.display === 'none' ? 'block' : 'none';
}
```

**Note**: Made globally available via `window.toggleDay = toggleDay;` for inline onclick handlers.

### Styling Approach (styles.css)

**Design System**:

- **Colors**:
  - Primary gradient: `#667eea` → `#764ba2`
  - Success: `#388e3c` / `#e8f5e9`
  - Error: `#d32f2f` / `#ffebee`
  - Info: `#1976d2` / `#e3f2fd`

- **Typography**:
  - System font stack for native look
  - Sizes: 0.85rem (meta) → 2.5rem (title)

- **Spacing**:
  - Consistent padding: 15px, 20px, 25px
  - Gap: 10px, 15px, 20px

- **Effects**:
  - Box shadows for depth
  - Hover transforms for interactivity
  - Smooth transitions (0.2s - 0.3s)

**Responsive Design**:

```css
@media (max-width: 768px) {
  /* Stack controls vertically */
  .date-controls { flex-direction: column; }

  /* Full-width buttons */
  .btn-primary { width: 100%; }

  /* Stack transaction details */
  .transaction { flex-direction: column; }
}
```

### State Management

Simple state management via DOM:

- **Loading State**: Button disabled, spinner shown
- **Success State**: Green status message, data rendered
- **Error State**: Red status message, empty state shown
- **Empty State**: Special UI when no data available

**Status Display**:
```javascript
function showStatus(message, type = 'loading') {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${type}`;
}
```

Classes: `loading`, `success`, `error`

## Wise API Integration

### Authentication

**Method**: Bearer Token Authentication

```http
GET /v4/profiles/{profileId}/balances
Host: api.sandbox.transferwise.tech
Authorization: Bearer YOUR_API_TOKEN
```

### API Endpoints Used

1. **Get Balances**: `/v4/profiles/{profileId}/balances`
   - Returns list of user's currency balances
   - Filter by `types=STANDARD` for regular accounts

2. **Get Statement**: `/v1/profiles/{profileId}/balance-statements/{balanceId}/statement.json`
   - Returns transaction history for a specific balance
   - Parameters:
     - `intervalStart`: ISO 8601 date
     - `intervalEnd`: ISO 8601 date
     - `type`: `COMPACT` (less detail) or `FLAT` (more detail)

### Transaction Filtering

The app filters transactions to show only expenses:

```javascript
transactions.filter(txn => txn.amount.value < 0)
```

**Why negative?**
- In accounting, debits (money leaving) are represented as negative values
- Credits (money incoming) are positive values

### Data Transformation

Raw Wise transaction → App transaction:

```javascript
{
  id: txn.referenceNumber,          // Unique ID
  date: txn.date,                    // ISO 8601 timestamp
  description: txn.details.description || 'Unknown',
  amount: Math.abs(txn.amount.value), // Convert to positive
  currency: txn.amount.currency,     // e.g., "USD"
  type: txn.details.type,            // Transaction type
  runningBalance: txn.runningBalance.value
}
```

## Security Considerations

### API Token Storage

- ✅ Stored in `.env` file (not committed to git)
- ✅ Loaded server-side only
- ✅ Never exposed to browser/frontend
- ✅ Transmitted only via HTTPS to Wise API

### CORS

CORS enabled to allow frontend-backend communication:

```javascript
app.use(cors());
```

**Production Consideration**: Should be restricted to specific origins:
```javascript
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

### Input Validation

Date inputs validated on both frontend and backend:

```javascript
// Frontend: HTML5 date input type validation
<input type="date" id="startDate">

// Backend: ISO string construction with validation
const intervalStart = req.query.intervalStart ||
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
```

## Performance Optimizations

### Frontend

1. **No Frameworks**: Faster initial load
2. **Minimal Dependencies**: Reduced bundle size
3. **CSS Transitions**: Hardware-accelerated animations
4. **Event Delegation**: Could be improved with delegation for day toggles

### Backend

1. **Single Balance Query**: Fetches first balance (assumes single currency)
2. **Compact Statement**: Uses `type=COMPACT` for smaller payload
3. **Filtered Response**: Only sends expenses, not all transactions

### Potential Improvements

- Cache API responses with TTL
- Implement request debouncing
- Add pagination for large datasets
- Use IndexedDB for client-side caching

## Testing Recommendations

### Manual Testing

1. **Sandbox Mode**:
   - Set `WISE_ENVIRONMENT=sandbox`
   - Use sandbox credentials
   - Create test transactions via Wise API

2. **Error Cases**:
   - Invalid token (401)
   - Wrong profile ID (403)
   - Server not running (connection error)
   - No transactions in range (empty state)

### Automated Testing (Future)

Could add:
- Unit tests for data transformation functions
- Integration tests for API endpoints
- E2E tests for full user flows

**Suggested Tools**:
- Jest for unit tests
- Supertest for API testing
- Playwright for E2E

## Deployment Considerations

### Current State
- Runs locally only
- Not suitable for public deployment (API tokens exposed server-side)

### For Production Deployment

1. **Environment Variables**: Use platform secrets (Heroku Config Vars, etc.)
2. **HTTPS**: Required for secure token transmission
3. **OAuth**: Consider implementing OAuth flow instead of personal tokens
4. **Database**: Add persistence layer (PostgreSQL, MongoDB)
5. **Authentication**: Add user login system
6. **Multi-user**: Support multiple Wise accounts

## Code Quality

### Documentation

- Inline comments explain complex logic
- JSDoc-style headers for main functions
- Comprehensive README and guides

### Error Handling

- Try-catch blocks for async operations
- Specific error messages for different failure modes
- User-friendly error display

### Code Style

- Consistent indentation (2 spaces)
- Descriptive variable names
- ES6+ syntax (const, arrow functions, async/await)
- Template literals for string interpolation

## Future Enhancements

### Technical Improvements

1. **TypeScript**: Add type safety
2. **Build System**: Add bundler (Vite, webpack)
3. **Testing**: Implement test suite
4. **Logging**: Add structured logging (Winston, Pino)
5. **Monitoring**: Add error tracking (Sentry)

### Feature Additions

1. **Data Export**: CSV/PDF generation
2. **Charts**: Visualization library (Chart.js)
3. **Categories**: Auto-categorize transactions
4. **Budgets**: Set and track spending limits
5. **Notifications**: Email/SMS alerts for spending

### Performance

1. **Caching**: Redis for API response caching
2. **Pagination**: Handle large transaction sets
3. **Lazy Loading**: Load transactions on demand
4. **Web Workers**: Offload data processing

## Troubleshooting Guide

### Debug Mode

Enable detailed logging:

```javascript
// server.js - Add at top
const DEBUG = process.env.DEBUG === 'true';

// Then use throughout:
if (DEBUG) console.log('API Response:', response.data);
```

### Common Issues

1. **CORS Errors**: Check browser console, verify CORS middleware
2. **API Errors**: Check server logs for Wise API responses
3. **Date Issues**: Verify timezone handling in date conversion
4. **UI Not Updating**: Check browser console for JS errors

### Logging API Requests

Add request logging middleware:

```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.query);
  next();
});
```

## Resources

- [Wise API Reference](https://docs.wise.com/api-reference)
- [Express.js Documentation](https://expressjs.com/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Node.js Documentation](https://nodejs.org/docs/)
