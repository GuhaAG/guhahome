/**
 * Mock Data Generator for Wise Expense Tracker
 * Generates realistic transaction data for UI development without API calls
 */

// Mock merchants and their typical transaction amounts
const mockMerchants = [
  { name: 'Uber Eats', minAmount: 1200, maxAmount: 4000, frequency: 0.3 },
  { name: '7-Eleven', minAmount: 300, maxAmount: 1500, frequency: 0.2 },
  { name: 'FamilyMart', minAmount: 400, maxAmount: 1200, frequency: 0.15 },
  { name: 'McDonald\'s', minAmount: 800, maxAmount: 2000, frequency: 0.15 },
  { name: 'Starbucks', minAmount: 600, maxAmount: 1200, frequency: 0.1 },
  { name: 'Yoshinoya', minAmount: 500, maxAmount: 1000, frequency: 0.1 },
  { name: 'Lawson', minAmount: 200, maxAmount: 800, frequency: 0.15 },
  { name: 'Sukiya', minAmount: 400, maxAmount: 900, frequency: 0.08 },
  { name: 'CoCo Ichibanya', minAmount: 800, maxAmount: 1500, frequency: 0.05 },
  { name: 'Saizeriya', minAmount: 700, maxAmount: 1800, frequency: 0.05 },
  { name: 'KFC Japan', minAmount: 900, maxAmount: 2200, frequency: 0.04 },
  { name: 'Mos Burger', minAmount: 800, maxAmount: 1600, frequency: 0.04 },
  { name: 'Doutor Coffee', minAmount: 400, maxAmount: 800, frequency: 0.03 },
  { name: 'Matsuya', minAmount: 500, maxAmount: 1200, frequency: 0.03 },
  { name: 'Uniqlo', minAmount: 2000, maxAmount: 8000, frequency: 0.02 }
];

// Generate random amount within merchant's typical range
function getRandomAmount(merchant) {
  const { minAmount, maxAmount } = merchant;
  const randomAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
  return randomAmount;
}

// Generate random date within the data window
function getRandomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime);
}

// Generate realistic transaction distribution (more on weekends, varied times)
function getTransactionCountForDate(date) {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Base probability of transactions
  let baseTransactions = Math.random() < 0.7 ? 1 : 0; // 70% chance of at least 1 transaction

  if (isWeekend) {
    baseTransactions += Math.random() < 0.5 ? 1 : 0; // 50% chance of extra transaction on weekends
  }

  // Occasional days with multiple transactions
  if (Math.random() < 0.3) {
    baseTransactions += Math.floor(Math.random() * 2) + 1; // 1-2 extra transactions
  }

  return Math.min(baseTransactions, 5); // Cap at 5 transactions per day
}

// Generate realistic time for transaction
function getRealisticTime(date) {
  // Typical meal/shopping hours distribution
  const hour = Math.random() < 0.6
    ? 11 + Math.floor(Math.random() * 8) // 60% chance: 11 AM - 7 PM
    : 8 + Math.floor(Math.random() * 14); // 40% chance: 8 AM - 10 PM

  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  const newDate = new Date(date);
  newDate.setHours(hour, minute, second);
  return newDate;
}

// Select merchant based on frequency weights
function selectRandomMerchant() {
  const totalWeight = mockMerchants.reduce((sum, merchant) => sum + merchant.frequency, 0);
  let random = Math.random() * totalWeight;

  for (const merchant of mockMerchants) {
    random -= merchant.frequency;
    if (random <= 0) {
      return merchant;
    }
  }

  return mockMerchants[0]; // Fallback
}

// Generate unique transaction ID
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `TU9ORVRBUllfQUNUSVZJVFk6OjMyMDM1NzQ6OkNBUkRfVFJBTlNBQ1RJT046OiR7timestamp}${random}`;
}

// Generate mock activities data
function generateMockActivities(startDate = '2025-12-01', endDate = '2025-12-31') {
  console.log('🎭 Generating mock activities data...');

  const activities = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generate transactions for each day
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const transactionCount = getTransactionCountForDate(currentDate);

    for (let i = 0; i < transactionCount; i++) {
      const merchant = selectRandomMerchant();
      const amount = getRandomAmount(merchant);
      const transactionTime = getRealisticTime(new Date(currentDate));

      const activity = {
        id: generateTransactionId(),
        type: 'CARD_PAYMENT',
        title: `<strong>${merchant.name}</strong>`,
        description: '',
        primaryAmount: `${amount.toLocaleString()} JPY`,
        secondaryAmount: '',
        status: 'COMPLETED',
        createdOn: transactionTime.toISOString()
      };

      activities.push(activity);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by date (most recent first)
  activities.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

  console.log(`🎭 Generated ${activities.length} mock activities`);
  return activities;
}

// Generate mock balance data
function generateMockBalance() {
  const mockBalance = {
    current: 120342, // Based on your actual balance
    reserved: 0,
    available: 120342
  };

  console.log('💰 Generated mock balance:', mockBalance);
  return mockBalance;
}

// Generate complete mock cached data structure
function generateMockCachedData(startDate = '2025-12-01', endDate = '2025-12-31') {
  console.log('🎭 MOCK MODE: Generating complete mock dataset');

  const activities = generateMockActivities(startDate, endDate);
  const balance = generateMockBalance();

  // Convert activities to transactions (same logic as real backend)
  const convertedTransactions = activities
    .filter(activity => activity.type === 'CARD_PAYMENT' && activity.primaryAmount)
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

  // Calculate daily totals
  const dailyTotals = convertedTransactions.reduce((acc, txn) => {
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

  const mockData = {
    activities: activities,
    transactions: convertedTransactions,
    dailyTotals: dailyTotals,
    lastUpdated: new Date().toISOString(),
    currency: 'JPY',
    balance: balance,
    dataWindow: {
      start: startDate,
      end: endDate
    }
  };

  console.log(`🎭 Mock data generated: ${convertedTransactions.length} transactions across ${Object.keys(dailyTotals).length} days`);
  return mockData;
}

module.exports = {
  generateMockActivities,
  generateMockBalance,
  generateMockCachedData
};