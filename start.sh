#!/bin/bash

echo "🚀 Starting Wise Expense Tracker (Live Mode)"
echo "📡 This will connect to the real Wise API"
echo ""

# Set environment to live mode
export MOCK_MODE=false

# Start the application
npm start