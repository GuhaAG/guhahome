/**
 * Wise Expense Tracker - Backend Server
 *
 * This server provides endpoints to fetch and process Wise card transactions.
 * It acts as a proxy between the frontend and Wise API to keep API credentials secure.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Wise API Configuration
const WISE_BASE_URL = process.env.WISE_ENVIRONMENT === 'production'
  ? 'https://api.wise.com'
  : 'https://api.sandbox.transferwise.tech';

const WISE_API_TOKEN = process.env.WISE_API_TOKEN;
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID;
const MOCK_MODE = process.env.MOCK_MODE === 'true';

// Settings file path
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

// Load settings from file (required)
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      console.log('📁 Loaded settings from file:', settings);
      return settings;
    } else {
      console.log('📁 Settings file not found, creating default settings.json');
      // Create default settings file
      const defaultSettings = {
        dataStartDate: '2024-12-01',
        dataEndDate: '2024-12-31'
      };
      saveSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('❌ Error loading settings file:', error.message);
    throw new Error(`Failed to load settings: ${error.message}`);
  }
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log('💾 Settings saved to file:', settings);
    return true;
  } catch (error) {
    console.error('❌ Error saving settings:', error.message);
    return false;
  }
}

// Initialize settings
let currentSettings = loadSettings();
let DATA_START_DATE = currentSettings.dataStartDate;
let DATA_END_DATE = currentSettings.dataEndDate;

// Import mock data generator
const { generateMockCachedData } = require('./mockData');

// In-memory data storage
let cachedData = {
  activities: [],
  transactions: [],
  dailyTotals: {},
  lastUpdated: null,
  currency: 'JPY',
  dataWindow: {
    start: DATA_START_DATE,
    end: DATA_END_DATE
  }
};

/**
 * Fetch activities from Wise API and process them
 */
async function fetchAndProcessActivities(startDate = DATA_START_DATE, endDate = DATA_END_DATE) {
  console.log(`🔄 Fetching activities from ${startDate} to ${endDate}...`);

  // Check if we're in mock mode
  if (MOCK_MODE) {
    console.log('🎭 Using mock data');
    cachedData = generateMockCachedData(startDate, endDate);
    return cachedData;
  }

  try {
    // Validate configuration for live mode
    if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
      throw new Error('Server not configured. Please set WISE_API_TOKEN and WISE_PROFILE_ID in .env file');
    }

    // Convert dates to ISO format if they're not already
    const intervalStart = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const intervalEnd = new Date(endDate + 'T23:59:59.999Z').toISOString();

    // Get balances first
    const balancesResponse = await axios.get(
      `${WISE_BASE_URL}/v3/profiles/${WISE_PROFILE_ID}/balances?types=STANDARD`,
      {
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`
        }
      }
    );

    if (!balancesResponse.data || balancesResponse.data.length === 0) {
      throw new Error('No balances found');
    }

    // Extract balance information
    const primaryBalance = balancesResponse.data[0];
    const currentBalance = primaryBalance.amount.value;
    const currency = primaryBalance.amount.currency;

    console.log(`💰 Current Balance: ${currentBalance} ${currency}`);

    // Fetch activities with proper cursor pagination (Wise API standard)
    let allActivities = [];
    let nextCursor = null;
    let pageCount = 0;
    const maxPages = 100;

    do {
      pageCount++;
      const activitiesUrl = `${WISE_BASE_URL}/v1/profiles/${WISE_PROFILE_ID}/activities`;
      const activitiesParams = {
        since: intervalStart,
        until: intervalEnd
      };

      if (nextCursor) {
        activitiesParams.nextCursor = nextCursor;
      }

      const activitiesResponse = await axios.get(activitiesUrl, {
        params: activitiesParams,
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`
        }
      });

      const pageActivities = activitiesResponse.data.activities || [];
      const responseCursor = activitiesResponse.data.cursor;

      // Add all activities from this page
      allActivities = allActivities.concat(pageActivities);

      // Update cursor for next iteration
      nextCursor = responseCursor;

      // Stop if no more pages or empty page
      if (!responseCursor || pageActivities.length === 0) {
        break;
      }

      // Safety check
      if (pageCount >= maxPages) {
        console.log(`⚠️ Reached maximum page limit (${maxPages})`);
        break;
      }

    } while (nextCursor);

    console.log(`📦 Fetched ${allActivities.length} activities across ${pageCount} pages`);

    // Deduplicate based on ID
    const uniqueActivities = [];
    const seenIds = new Set();

    for (const activity of allActivities) {
      if (!seenIds.has(activity.id)) {
        uniqueActivities.push(activity);
        seenIds.add(activity.id);
      }
    }

    if (allActivities.length !== uniqueActivities.length) {
      console.log(`🗑️ Removed ${allActivities.length - uniqueActivities.length} duplicate activities`);
    }

    const activities = uniqueActivities;

    // Filter and convert activities to transactions
    const cardPayments = activities.filter(activity => activity.type === 'CARD_PAYMENT');
    const cardPaymentsWithAmount = cardPayments.filter(activity => activity.primaryAmount);

    console.log(`💳 Found ${cardPaymentsWithAmount.length} card transactions`);

    const convertedTransactions = cardPaymentsWithAmount
      .map(activity => {
        const amountMatch = activity.primaryAmount.match(/([\d,]+)\s+(\w+)/);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        const currency = amountMatch ? amountMatch[2] : 'JPY';
        const description = activity.title.replace(/<[^>]*>/g, '') || 'Card Payment';

        return {
          id: activity.id,
          date: activity.createdOn,
          description: description,
          amount: amount,
          currency: currency,
          type: activity.type,
          runningBalance: null
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Final deduplication by transaction ID
    const uniqueTransactions = convertedTransactions.reduce((acc, txn) => {
      if (!acc.find(existing => existing.id === txn.id)) {
        acc.push(txn);
      }
      return acc;
    }, []);

    const finalTransactions = uniqueTransactions;

    // Calculate daily totals
    const dailyTotals = finalTransactions.reduce((acc, txn) => {
      const date = txn.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          total: 0,
          count: 0,
          currency: txn.currency,
          transactions: []
        };
      }
      acc[date].total += txn.amount;
      acc[date].count += 1;
      acc[date].transactions.push(txn);
      return acc;
    }, {});

    // Round totals
    Object.keys(dailyTotals).forEach(date => {
      dailyTotals[date].total = Math.round(dailyTotals[date].total * 100) / 100;
    });

    // Update cached data
    cachedData = {
      activities: activities,
      transactions: finalTransactions,
      dailyTotals: dailyTotals,
      lastUpdated: new Date().toISOString(),
      currency: currency,
      balance: {
        current: currentBalance,
        reserved: primaryBalance.reservedAmount.value,
        available: currentBalance - primaryBalance.reservedAmount.value
      },
      dataWindow: {
        start: startDate,
        end: endDate
      }
    };

    console.log(`✅ Processed ${finalTransactions.length} transactions across ${Object.keys(dailyTotals).length} days`);
    return cachedData;

  } catch (error) {
    console.error('❌ Error fetching activities:', error.message);
    throw error;
  }
}

/**
 * Get current settings
 */
app.get('/api/settings', (req, res) => {
  res.json({
    dataStartDate: currentSettings.dataStartDate,
    dataEndDate: currentSettings.dataEndDate
  });
});

/**
 * Update settings and refresh data
 */
app.post('/api/settings', async (req, res) => {
  try {
    const { dataStartDate, dataEndDate } = req.body;

    if (!dataStartDate || !dataEndDate) {
      return res.status(400).json({
        error: 'Both dataStartDate and dataEndDate are required'
      });
    }

    // Validate dates
    const startDate = new Date(dataStartDate);
    const endDate = new Date(dataEndDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format. Please use YYYY-MM-DD format.'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        error: 'Start date must be before end date'
      });
    }

    // Update settings
    currentSettings = { dataStartDate, dataEndDate };
    DATA_START_DATE = dataStartDate;
    DATA_END_DATE = dataEndDate;

    // Save to file
    if (!saveSettings(currentSettings)) {
      return res.status(500).json({
        error: 'Failed to save settings'
      });
    }

    console.log('⚙️ Settings updated, refreshing data...');

    // Refresh data with new date range
    await fetchAndProcessActivities(dataStartDate, dataEndDate);

    res.json({
      success: true,
      message: 'Settings updated and data refreshed successfully',
      settings: currentSettings,
      transactionCount: cachedData.transactions.length,
      dayCount: Object.keys(cachedData.dailyTotals).length
    });

  } catch (error) {
    console.error('❌ Settings update failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const isConfigured = !!(WISE_API_TOKEN && WISE_PROFILE_ID);
  res.json({
    status: 'ok',
    configured: isConfigured,
    environment: process.env.WISE_ENVIRONMENT || 'sandbox'
  });
});

/**
 * Debug endpoint to list all profiles
 */
app.get('/api/debug/profiles', async (req, res) => {
  try {
    if (!WISE_API_TOKEN) {
      return res.status(500).json({ error: 'WISE_API_TOKEN not configured' });
    }

    const profilesResponse = await axios.get(
      `${WISE_BASE_URL}/v2/profiles`,
      {
        headers: {
          'Authorization': `Bearer ${WISE_API_TOKEN}`
        }
      }
    );

    // Debug endpoint - profiles found

    res.json({
      currentProfileId: WISE_PROFILE_ID,
      availableProfiles: profilesResponse.data,
      recommendation: profilesResponse.data.length > 0 ?
        `You should set WISE_PROFILE_ID=${profilesResponse.data[0].id} in your .env file` :
        'No profiles found'
    });
  } catch (error) {
    console.error('Error fetching profiles:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch profiles',
      details: error.response?.data || error.message
    });
  }
});

/**
 * Get transactions from cached data with optional date filtering
 */
app.get('/api/transactions', async (req, res) => {
  try {
    // Check if we have cached data
    if (!cachedData.lastUpdated) {
      return res.status(503).json({
        error: 'Data not available yet. Server is starting up or data fetch failed.',
        suggestion: 'Try again in a few seconds or check server logs.'
      });
    }

    // Get date range from query params
    const requestedStart = req.query.intervalStart;
    const requestedEnd = req.query.intervalEnd;

    let filteredTransactions = cachedData.transactions;
    let filteredDailyTotals = cachedData.dailyTotals;

    // If specific date range is requested, filter cached data
    if (requestedStart || requestedEnd) {
      const startDate = requestedStart ? new Date(requestedStart) : new Date('1900-01-01');
      const endDate = requestedEnd ? new Date(requestedEnd) : new Date('2100-01-01');

      // Filter transactions
      filteredTransactions = cachedData.transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        return txnDate >= startDate && txnDate <= endDate;
      });

      // Recalculate daily totals for filtered date range
      filteredDailyTotals = filteredTransactions.reduce((acc, txn) => {
        const date = txn.date.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            total: 0,
            count: 0,
            currency: txn.currency,
            transactions: []
          };
        }
        acc[date].total += txn.amount;
        acc[date].count += 1;
        acc[date].transactions.push(txn);
        return acc;
      }, {});

      // Round totals
      Object.keys(filteredDailyTotals).forEach(date => {
        filteredDailyTotals[date].total = Math.round(filteredDailyTotals[date].total * 100) / 100;
      });
    }

    // Serving cached transaction data

    res.json({
      transactions: filteredTransactions,
      dailyTotals: filteredDailyTotals,
      period: {
        start: requestedStart || cachedData.dataWindow.start,
        end: requestedEnd || cachedData.dataWindow.end
      },
      currency: cachedData.currency,
      balance: cachedData.balance, // Add balance to response
      lastUpdated: cachedData.lastUpdated,
      dataWindow: cachedData.dataWindow,
      cached: true
    });

  } catch (error) {
    console.error('Error serving cached transactions:', error.message);
    res.status(500).json({
      error: 'Failed to serve transaction data',
      details: error.message
    });
  }
});

/**
 * Resync endpoint to refresh data from Wise API
 */
app.post('/api/resync', async (req, res) => {
  try {
    console.log('🔄 Manual resync requested');

    // Use custom date range if provided, otherwise use configured window
    const startDate = req.body.startDate || DATA_START_DATE;
    const endDate = req.body.endDate || DATA_END_DATE;

    await fetchAndProcessActivities(startDate, endDate);

    res.json({
      success: true,
      message: 'Data successfully refreshed',
      lastUpdated: cachedData.lastUpdated,
      transactionCount: cachedData.transactions.length,
      dayCount: Object.keys(cachedData.dailyTotals).length,
      dataWindow: cachedData.dataWindow
    });

  } catch (error) {
    console.error('❌ Resync failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh data',
      details: error.message
    });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/finances', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'finance.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚀 My WISE Tracker running at http://localhost:${PORT}`);
  console.log(`🎭 Mode: ${MOCK_MODE ? 'MOCK' : 'LIVE'}`);
  console.log(`📅 Data window: ${DATA_START_DATE} to ${DATA_END_DATE}`);
  console.log(`⚙️ Settings file: ${SETTINGS_FILE}\n`);

  if (MOCK_MODE) {
    console.log('🔄 Generating mock data...');
    try {
      await fetchAndProcessActivities();
      console.log('✅ Ready\n');
    } catch (error) {
      console.error('❌ Mock data generation failed:', error.message);
    }
  } else {
    if (!WISE_API_TOKEN || !WISE_PROFILE_ID) {
      console.log('⚠️  Server not configured - please check .env file\n');
    } else if (!DATA_START_DATE || !DATA_END_DATE) {
      console.log('⚠️  Data window not configured - please set dates in .env\n');
    } else {
      console.log('🔄 Loading initial data...');
      try {
        await fetchAndProcessActivities();
        console.log('✅ Ready\n');
      } catch (error) {
        console.error('❌ Initial data fetch failed:', error.message);
        console.log('⚠️  Server running but may need resync\n');
      }
    }

    // Create settings file if it doesn't exist
    if (!fs.existsSync(SETTINGS_FILE)) {
      saveSettings(currentSettings);
    }
  }
});
