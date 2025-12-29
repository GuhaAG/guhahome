/**
 * Wise Expense Tracker - Frontend Application
 *
 * This script handles:
 * - Fetching transactions from the backend API
 * - Displaying daily expense totals
 * - Rendering individual transactions
 * - Date range selection
 */

const API_BASE_URL = 'http://localhost:3000';

// DOM elements
const resyncBtn = document.getElementById('resyncBtn');
const statusDiv = document.getElementById('status');
const summaryDiv = document.getElementById('summary');
const dailyTotalsDiv = document.getElementById('dailyTotals');
const cacheInfoDiv = document.getElementById('cacheInfo');
const lastUpdatedSpan = document.getElementById('lastUpdated');
const dataWindowSpan = document.getElementById('dataWindow');

// Settings modal elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

// Show status message
function showStatus(message, type = 'loading') {
    statusDiv.textContent = message;
    statusDiv.className = `status show ${type}`;
}

// Hide status message
function hideStatus() {
    statusDiv.className = 'status';
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time for display
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Categorize transactions based on merchant/description
function categorizeTransaction(description) {
    const desc = description.toLowerCase();

    const categories = {
        food: {
            keywords: ['uber eats', 'doordash', 'grubhub', 'restaurant', 'mcdonalds', 'kfc', 'pizza', 'cafe', 'starbucks', 'food', 'dining'],
            icon: '🍴',
            name: 'Food & Dining'
        },
        transport: {
            keywords: ['uber', 'lyft', 'taxi', 'train', 'bus', 'metro', 'transport', 'gas', 'fuel', 'parking'],
            icon: '🚗',
            name: 'Transportation'
        },
        shopping: {
            keywords: ['amazon', 'walmart', 'target', 'shop', 'store', 'market', 'mall', 'retail'],
            icon: '🛍️',
            name: 'Shopping'
        },
        entertainment: {
            keywords: ['netflix', 'spotify', 'movie', 'cinema', 'game', 'entertainment', 'youtube', 'subscription'],
            icon: '🎬',
            name: 'Entertainment'
        },
        health: {
            keywords: ['pharmacy', 'hospital', 'clinic', 'health', 'medical', 'doctor', 'medicine'],
            icon: '🏥',
            name: 'Health & Medical'
        },
        utilities: {
            keywords: ['electric', 'water', 'internet', 'phone', 'utility', 'bill', 'service'],
            icon: '📱',
            name: 'Utilities & Bills'
        },
        convenience: {
            keywords: ['7-eleven', 'convenience', 'corner', 'quick', 'mini mart', 'familymart', 'lawson'],
            icon: '🏠',
            name: 'Convenience Store'
        }
    };

    for (const [key, category] of Object.entries(categories)) {
        for (const keyword of category.keywords) {
            if (desc.includes(keyword)) {
                return { key, ...category };
            }
        }
    }

    return { key: 'other', icon: '📋', name: 'Other' };
}

// Analyze spending by categories
function analyzeSpendingByCategory(transactions) {
    const categoryTotals = {};
    const categoryTransactions = {};

    transactions.forEach(txn => {
        const category = categorizeTransaction(txn.description);
        const amount = Math.abs(txn.amount);

        if (!categoryTotals[category.key]) {
            categoryTotals[category.key] = {
                ...category,
                amount: 0,
                count: 0
            };
            categoryTransactions[category.key] = [];
        }

        categoryTotals[category.key].amount += amount;
        categoryTotals[category.key].count += 1;
        categoryTransactions[category.key].push(txn);
    });

    return Object.values(categoryTotals).sort((a, b) => b.amount - a.amount);
}

// Analyze daily spending trends
function analyzeDailyTrends(dailyTotals) {
    const days = Object.keys(dailyTotals)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(-14); // Last 14 days

    return days.map(date => ({
        date,
        amount: dailyTotals[date].total,
        count: dailyTotals[date].count,
        formattedDate: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
}

// Generate spending insights
function generateSpendingInsights(data, budgetMetrics) {
    const insights = [];
    const categories = analyzeSpendingByCategory(data.transactions);
    const trends = analyzeDailyTrends(data.dailyTotals);

    // Top spending category
    if (categories.length > 0) {
        const topCategory = categories[0];
        const percentage = ((topCategory.amount / budgetMetrics.spent) * 100).toFixed(1);
        insights.push({
            icon: topCategory.icon,
            title: `${topCategory.name} is your biggest expense`,
            description: `${percentage}% of spending (¥${topCategory.amount.toLocaleString()}) across ${topCategory.count} transactions`
        });
    }

    // Daily average
    if (trends.length > 0) {
        const dailyAverage = budgetMetrics.spent / trends.length;
        const comparison = budgetMetrics.budgetPerDay > dailyAverage ? 'under' : 'over';
        const difference = Math.abs(budgetMetrics.budgetPerDay - dailyAverage);
        insights.push({
            icon: comparison === 'under' ? '🟢' : '🟡',
            title: `Daily spending is ${comparison} target`,
            description: `Averaging ¥${dailyAverage.toLocaleString()} per day, ¥${difference.toLocaleString()} ${comparison} your daily budget target`
        });
    }

    // Budget projection
    if (budgetMetrics.daysRemaining > 0) {
        const projectedTotal = budgetMetrics.spent + (budgetMetrics.budgetPerDay * 0.8 * budgetMetrics.daysRemaining);
        const projectedPercentage = (projectedTotal / budgetMetrics.budget * 100).toFixed(1);

        if (projectedPercentage < 90) {
            insights.push({
                icon: '🎯',
                title: 'On track to stay within budget',
                description: `Projected to use ${projectedPercentage}% of budget if you maintain current pace`
            });
        } else {
            insights.push({
                icon: '⚠️',
                title: 'Risk of exceeding budget',
                description: `Projected to use ${projectedPercentage}% of budget. Consider reducing daily spending by ¥${((projectedTotal - budgetMetrics.budget) / budgetMetrics.daysRemaining).toLocaleString()}`
            });
        }
    }

    return insights;
}

// Render summary statistics
function renderSummary(data) {
    const totalExpenses = Object.values(data.dailyTotals || {}).reduce(
        (sum, day) => sum + day.total,
        0
    );
    const totalTransactions = (data.transactions || []).length;
    const activeDays = Object.keys(data.dailyTotals || {}).length;

    // Calculate budget metrics (balance is remaining budget, not total budget)
    if (data.balance && data.dataWindow) {
        const remainingBalance = data.balance.current;
        const spentAmount = totalExpenses || 0;
        const totalBudget = remainingBalance + spentAmount; // True budget = remaining + spent

        const startDate = new Date(data.dataWindow.start);
        const endDate = new Date(data.dataWindow.end);
        const currentDate = new Date();

        // Calculate days remaining in budget window
        const daysRemaining = Math.max(0, Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24)));
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Calculate spending metrics - handle zero/empty cases
        const spentPercentage = totalBudget > 0 ? ((spentAmount / totalBudget) * 100) : 0;
        const budgetPerDay = daysRemaining > 0 ? (remainingBalance / daysRemaining) : 0;

        // Display total budget (remaining + spent)
        document.getElementById('monthlyBudget').textContent = formatCurrency(totalBudget, data.currency);

        // Update budget overview UI
        const budgetMetrics = {
            budget: totalBudget,
            spent: spentAmount,
            remaining: remainingBalance,
            spentPercentage: parseFloat(spentPercentage.toFixed(1)) || 0,
            daysRemaining: daysRemaining,
            totalDays: totalDays,
            budgetPerDay: budgetPerDay,
            currency: data.currency,
            hasTransactions: totalTransactions > 0
        };

        updateBudgetOverview(budgetMetrics);

        // Only check alerts if we have transaction data
        if (totalTransactions > 0) {
            checkAndShowAlerts(budgetMetrics, data);
        }

        // Store calculations for potential use in other UI elements
        window.budgetMetrics = {
            budget: totalBudget,
            spent: spentAmount,
            remaining: remainingBalance,
            spentPercentage: parseFloat(spentPercentage.toFixed(1)) || 0,
            daysRemaining: daysRemaining,
            totalDays: totalDays,
            budgetPerDay: budgetPerDay,
            currency: data.currency
        };

        console.log('💰 Budget Metrics:', window.budgetMetrics);
        console.log(`📊 Budget Calculation: Remaining (${formatCurrency(remainingBalance, data.currency)}) + Spent (${formatCurrency(spentAmount, data.currency)}) = Total Budget (${formatCurrency(totalBudget, data.currency)})`);

    } else {
        document.getElementById('monthlyBudget').textContent = 'N/A';
    }

    document.getElementById('totalExpenses').textContent =
        formatCurrency(totalExpenses, data.currency);
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('activeDays').textContent = activeDays;

    summaryDiv.style.display = 'grid';
}

// Render analytics section
function renderAnalytics(data) {
    if (!window.budgetMetrics) return;

    // Check if we have meaningful data
    const hasTransactions = (data.transactions || []).length > 0;
    const hasDailyTotals = Object.keys(data.dailyTotals || {}).length > 0;

    if (!hasTransactions || !hasDailyTotals) {
        // Show empty state for analytics
        document.getElementById('analyticsSection').style.display = 'block';
        renderEmptyAnalytics();
        return;
    }

    const categories = analyzeSpendingByCategory(data.transactions);
    const trends = analyzeDailyTrends(data.dailyTotals);
    const insights = generateSpendingInsights(data, window.budgetMetrics);

    renderCategoryChart(categories, window.budgetMetrics.currency);
    renderTrendChart(trends, window.budgetMetrics.currency);
    renderInsights(insights);

    document.getElementById('analyticsSection').style.display = 'block';
}

// Render empty state for analytics
function renderEmptyAnalytics() {
    document.getElementById('categoryChart').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #cbd5e1;">
            <div style="font-size: 3rem; margin-bottom: 15px;">📊</div>
            <h3 style="margin-bottom: 10px; color: #f1f5f9;">No Categories Yet</h3>
            <p>Start making transactions to see your spending breakdown by category.</p>
        </div>
    `;

    document.getElementById('trendChart').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #cbd5e1;">
            <div style="font-size: 3rem; margin-bottom: 15px;">📈</div>
            <h3 style="margin-bottom: 10px; color: #f1f5f9;">No Trends Available</h3>
            <p>Daily spending trends will appear here once you have transaction history.</p>
        </div>
    `;

    document.getElementById('spendingInsights').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #cbd5e1;">
            <div style="font-size: 3rem; margin-bottom: 15px;">💡</div>
            <h3 style="margin-bottom: 10px; color: #f1f5f9;">No Insights Yet</h3>
            <p>AI-powered spending insights will appear here based on your transaction patterns.</p>
        </div>
    `;
}

// Render category breakdown chart
function renderCategoryChart(categories, currency) {
    const chartDiv = document.getElementById('categoryChart');
    const totalSpent = categories.reduce((sum, cat) => sum + cat.amount, 0);

    if (categories.length === 0) {
        chartDiv.innerHTML = '<p style="text-align: center; color: #666;">No categories to display</p>';
        return;
    }

    const html = categories.map(category => {
        const percentage = ((category.amount / totalSpent) * 100).toFixed(1);
        return `
            <div class="category-item">
                <div class="category-info">
                    <div class="category-icon">${category.icon}</div>
                    <div class="category-details">
                        <div class="category-name">${category.name}</div>
                        <div class="category-count">${category.count} transaction${category.count > 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="category-amount">
                    ${formatCurrency(category.amount, currency)}
                    <div class="category-percentage">${percentage}%</div>
                </div>
            </div>
        `;
    }).join('');

    chartDiv.innerHTML = html;
}

// Render daily trend chart
function renderTrendChart(trends, currency) {
    const chartDiv = document.getElementById('trendChart');

    if (trends.length === 0) {
        chartDiv.innerHTML = '<p style="text-align: center; color: #666;">No trend data to display</p>';
        return;
    }

    const maxAmount = Math.max(...trends.map(t => t.amount));

    const barsHtml = trends.map(day => {
        const height = maxAmount > 0 ? (day.amount / maxAmount) * 200 : 0;
        return `
            <div class="trend-bar" style="height: ${height}px;" title="${day.formattedDate}: ${formatCurrency(day.amount, currency)}">
                <div class="trend-bar-value">¥${(day.amount / 1000).toFixed(1)}k</div>
                <div class="trend-bar-label">${day.formattedDate}</div>
            </div>
        `;
    }).join('');

    chartDiv.innerHTML = `
        <div class="trend-bars">
            ${barsHtml}
        </div>
    `;
}

// Render spending insights
function renderInsights(insights) {
    const insightsDiv = document.getElementById('spendingInsights');

    if (insights.length === 0) {
        insightsDiv.innerHTML = '<p style="text-align: center; color: #666;">No insights available</p>';
        return;
    }

    const html = insights.map(insight => `
        <div class="insight-item">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        </div>
    `).join('');

    insightsDiv.innerHTML = html;
}

// Alert system
let activeAlerts = new Set();

// Check for budget alerts and show them
function checkAndShowAlerts(budgetMetrics, data) {
    const alerts = [];

    // Budget threshold alerts
    if (budgetMetrics.spentPercentage >= 90 && !activeAlerts.has('budget-90')) {
        alerts.push({
            id: 'budget-90',
            type: 'danger',
            icon: '🚨',
            title: 'Budget Alert: Over 90% Used',
            message: `You've spent ${budgetMetrics.spentPercentage.toFixed(1)}% of your monthly budget. Consider reducing spending for the remaining ${budgetMetrics.daysRemaining} days.`
        });
    } else if (budgetMetrics.spentPercentage >= 75 && !activeAlerts.has('budget-75')) {
        alerts.push({
            id: 'budget-75',
            type: 'warning',
            icon: '⚠️',
            title: 'Budget Alert: 75% Used',
            message: `You've used ${budgetMetrics.spentPercentage.toFixed(1)}% of your budget. You have ${formatCurrency(budgetMetrics.remaining, budgetMetrics.currency)} left for ${budgetMetrics.daysRemaining} days.`
        });
    }

    // Daily spending alerts
    const today = new Date().toISOString().split('T')[0];
    const todaySpending = data.dailyTotals[today]?.total || 0;
    const avgDailyTarget = budgetMetrics.budgetPerDay;

    if (todaySpending > avgDailyTarget * 1.5 && !activeAlerts.has('daily-overspend')) {
        alerts.push({
            id: 'daily-overspend',
            type: 'warning',
            icon: '💸',
            title: 'High Daily Spending',
            message: `Today's spending (${formatCurrency(todaySpending, budgetMetrics.currency)}) is ${((todaySpending / avgDailyTarget - 1) * 100).toFixed(0)}% above your daily target.`
        });
    }

    // Category spending alerts
    const categories = analyzeSpendingByCategory(data.transactions);
    const topCategory = categories[0];
    if (topCategory && topCategory.amount > budgetMetrics.spent * 0.4 && !activeAlerts.has('category-dominant')) {
        alerts.push({
            id: 'category-dominant',
            type: 'info',
            icon: topCategory.icon,
            title: `${topCategory.name} Dominates Spending`,
            message: `${topCategory.name} accounts for ${((topCategory.amount / budgetMetrics.spent) * 100).toFixed(1)}% of your total spending. Consider reviewing this category.`
        });
    }

    // Positive reinforcement alerts
    if (budgetMetrics.spentPercentage < 50 && budgetMetrics.daysRemaining < budgetMetrics.totalDays / 2 && !activeAlerts.has('on-track')) {
        alerts.push({
            id: 'on-track',
            type: 'success',
            icon: '🎉',
            title: 'Great Job! Staying On Track',
            message: `You're only at ${budgetMetrics.spentPercentage.toFixed(1)}% of your budget halfway through the period. Keep up the excellent spending discipline!`
        });
    }

    // Show alerts
    alerts.forEach(alert => showAlert(alert));
}

// Show an individual alert
function showAlert(alert) {
    if (activeAlerts.has(alert.id)) return;

    activeAlerts.add(alert.id);
    const container = document.getElementById('alertsContainer');

    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${alert.type}`;
    alertElement.innerHTML = `
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-content">
            <div class="alert-title">${alert.title}</div>
            <div class="alert-message">${alert.message}</div>
        </div>
        <button class="alert-close" onclick="dismissAlert('${alert.id}', this)">×</button>
    `;

    container.appendChild(alertElement);

    // Auto-dismiss success alerts after 10 seconds
    if (alert.type === 'success') {
        setTimeout(() => {
            if (alertElement.parentNode) {
                dismissAlert(alert.id, alertElement.querySelector('.alert-close'));
            }
        }, 10000);
    }
}

// Dismiss an alert
function dismissAlert(alertId, buttonElement) {
    activeAlerts.delete(alertId);
    const alertElement = buttonElement.closest('.alert');
    alertElement.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 300);
}

// Make dismissAlert available globally
window.dismissAlert = dismissAlert;

// CSS for slide out animation
if (!document.getElementById('alertAnimations')) {
    const style = document.createElement('style');
    style.id = 'alertAnimations';
    style.textContent = `
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateY(0);
                max-height: 100px;
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
                max-height: 0;
                margin-bottom: 0;
                padding-top: 0;
                padding-bottom: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Generate spending forecast
function generateSpendingForecast(data, budgetMetrics) {
    const trends = analyzeDailyTrends(data.dailyTotals);
    const recentTrends = trends.slice(-7); // Last 7 days

    // Handle empty data gracefully
    let avgDailySpending = 0;
    if (recentTrends.length > 0) {
        avgDailySpending = recentTrends.reduce((sum, day) => sum + day.amount, 0) / recentTrends.length;
    } else if (budgetMetrics.spent > 0 && budgetMetrics.totalDays > budgetMetrics.daysRemaining) {
        avgDailySpending = budgetMetrics.spent / (budgetMetrics.totalDays - budgetMetrics.daysRemaining);
    } else {
        // No spending data, use a conservative estimate
        avgDailySpending = budgetMetrics.budgetPerDay * 0.8;
    }

    // Generate forecast for remaining days
    const forecast = [];
    const today = new Date();

    // Add historical data (last 7 days)
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = data.dailyTotals[dateStr];

        forecast.push({
            date: dateStr,
            amount: dayData ? dayData.total : 0,
            type: i === 0 ? 'today' : 'historical',
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }

    // Add predictions for next 7 days
    const weekdayMultipliers = {
        0: 0.8, // Sunday
        1: 1.1, // Monday
        2: 1.0, // Tuesday
        3: 1.0, // Wednesday
        4: 1.1, // Thursday
        5: 1.3, // Friday
        6: 1.2  // Saturday
    };

    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();

        const predictedAmount = avgDailySpending * weekdayMultipliers[dayOfWeek];

        forecast.push({
            date: dateStr,
            amount: predictedAmount,
            type: 'predicted',
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }

    return forecast;
}


// Render forecast
function renderForecastAndRecommendations(data) {
    if (!window.budgetMetrics) return;

    const hasTransactions = (data.transactions || []).length > 0;
    const hasDailyTotals = Object.keys(data.dailyTotals || {}).length > 0;

    if (!hasTransactions || !hasDailyTotals) {
        // Show empty state for forecast
        renderEmptyForecast();
        document.getElementById('forecastSection').style.display = 'block';
        return;
    }

    const forecast = generateSpendingForecast(data, window.budgetMetrics);

    renderForecastChart(forecast, window.budgetMetrics.currency);
    renderForecastSummary(forecast, window.budgetMetrics);

    document.getElementById('forecastSection').style.display = 'block';
}

// Render empty forecast state
function renderEmptyForecast() {
    document.getElementById('forecastChart').innerHTML = `
        <div style="text-align: center; padding: 60px; color: #cbd5e1;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🔮</div>
            <h3 style="margin-bottom: 10px; color: #f1f5f9;">No Forecast Data</h3>
            <p>Spending forecasts will be generated once you have transaction history to analyze.</p>
        </div>
    `;

    document.getElementById('forecastSummary').innerHTML = `
        <div class="forecast-metric">
            <div class="forecast-metric-label">Projected Total</div>
            <div class="forecast-metric-value">-</div>
            <div class="forecast-metric-change">No data yet</div>
        </div>
        <div class="forecast-metric">
            <div class="forecast-metric-label">Weekly Forecast</div>
            <div class="forecast-metric-value">-</div>
            <div class="forecast-metric-change">No data yet</div>
        </div>
        <div class="forecast-metric">
            <div class="forecast-metric-label">Budget Health</div>
            <div class="forecast-metric-value">Excellent</div>
            <div class="forecast-metric-change positive">No spending yet!</div>
        </div>
    `;
}


// Render forecast chart
function renderForecastChart(forecast, currency) {
    const chartDiv = document.getElementById('forecastChart');
    const maxAmount = Math.max(...forecast.map(d => d.amount));

    const barsHtml = forecast.map(day => {
        const height = maxAmount > 0 ? (day.amount / maxAmount) * 150 : 0;
        return `
            <div class="forecast-day ${day.type}"
                 style="height: ${height}px;"
                 title="${day.label}: ${formatCurrency(day.amount, currency)}">
                <div class="forecast-day-label">${day.label.split(' ')[1]}</div>
            </div>
        `;
    }).join('');

    chartDiv.innerHTML = `
        <div class="forecast-timeline">
            ${barsHtml}
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 0.8rem; color: #666;">
            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(to top, #667eea, #764ba2); margin-right: 5px; vertical-align: middle;"></span>Historical
            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(to top, #ffc107, #e0a800); margin: 0 5px; vertical-align: middle;"></span>Today
            <span style="display: inline-block; width: 12px; height: 12px; background: linear-gradient(to top, #48bb78, #38a169); margin-left: 5px; vertical-align: middle; opacity: 0.7;"></span>Forecast
        </div>
    `;
}

// Render forecast summary
function renderForecastSummary(forecast, budgetMetrics) {
    const summaryDiv = document.getElementById('forecastSummary');
    const predictedDays = forecast.filter(d => d.type === 'predicted');
    const predictedTotal = predictedDays.reduce((sum, day) => sum + day.amount, 0);
    const projectedMonthTotal = budgetMetrics.spent + predictedTotal;
    const projectedPercentage = (projectedMonthTotal / budgetMetrics.budget * 100).toFixed(1);

    summaryDiv.innerHTML = `
        <div class="forecast-metric">
            <div class="forecast-metric-label">Projected Total</div>
            <div class="forecast-metric-value">${formatCurrency(projectedMonthTotal, budgetMetrics.currency)}</div>
            <div class="forecast-metric-change ${projectedPercentage > 100 ? 'negative' : 'positive'}">
                ${projectedPercentage}% of budget
            </div>
        </div>

        <div class="forecast-metric">
            <div class="forecast-metric-label">Weekly Forecast</div>
            <div class="forecast-metric-value">${formatCurrency(predictedTotal, budgetMetrics.currency)}</div>
            <div class="forecast-metric-change">
                Next 7 days
            </div>
        </div>

        <div class="forecast-metric">
            <div class="forecast-metric-label">Budget Health</div>
            <div class="forecast-metric-value">${projectedPercentage < 90 ? 'Good' : projectedPercentage < 100 ? 'Caution' : 'Over Budget'}</div>
            <div class="forecast-metric-change ${projectedPercentage < 90 ? 'positive' : 'negative'}">
                ${projectedPercentage < 100 ? 'On track' : 'Action needed'}
            </div>
        </div>
    `;
}


// Render daily totals and transactions
function renderDailyTotals(data) {
    if (!data.dailyTotals || Object.keys(data.dailyTotals).length === 0) {
        dailyTotalsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h2>No transactions found</h2>
                <p>Try adjusting your date range or check your Wise account for recent activity.</p>
            </div>
        `;
        return;
    }

    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(data.dailyTotals).sort((a, b) => {
        return new Date(b) - new Date(a);
    });

    let html = '';

    sortedDates.forEach(date => {
        const day = data.dailyTotals[date];
        const formattedDate = formatDate(date);

        html += `
            <div class="day-section">
                <div class="day-header" onclick="toggleDay('${date}')">
                    <div>
                        <span class="day-date">${formattedDate}</span>
                        <span class="day-count">(${day.count} transaction${day.count > 1 ? 's' : ''})</span>
                    </div>
                    <div class="day-total">${formatCurrency(day.total, day.currency)}</div>
                </div>
                <div class="day-transactions" id="day-${date}" style="display: none;">
                    ${renderTransactions(day.transactions, day.currency)}
                </div>
            </div>
        `;
    });

    dailyTotalsDiv.innerHTML = html;
}

// Render individual transactions for a day
function renderTransactions(transactions, currency) {
    return transactions.map(txn => `
        <div class="transaction">
            <div class="transaction-details">
                <div class="transaction-description">${txn.description}</div>
                <div class="transaction-meta">
                    ${formatTime(txn.date)} • ${txn.type}
                </div>
            </div>
            <div class="transaction-amount">
                ${formatCurrency(txn.amount, currency)}
            </div>
        </div>
    `).join('');
}

// Update budget overview section
function updateBudgetOverview(metrics) {
    const budgetOverview = document.getElementById('budgetOverview');
    const budgetStatus = document.getElementById('budgetStatus');
    const progressFill = document.getElementById('progressFill');
    const spentPercentage = document.getElementById('spentPercentage');
    const daysRemaining = document.getElementById('daysRemaining');
    const budgetPerDay = document.getElementById('budgetPerDay');
    const remainingBudget = document.getElementById('remainingBudget');

    // Handle empty transaction state
    if (!metrics.hasTransactions) {
        budgetStatus.textContent = '🌟 Ready to Start';
        budgetStatus.className = 'budget-status';

        progressFill.style.width = '0%';
        progressFill.className = 'progress-fill';

        spentPercentage.textContent = '0%';
        daysRemaining.textContent = metrics.daysRemaining;
        budgetPerDay.textContent = formatCurrency(metrics.budgetPerDay, metrics.currency);
        remainingBudget.textContent = formatCurrency(metrics.remaining, metrics.currency);

        budgetOverview.style.display = 'block';
        return;
    }

    // Determine budget status and color for actual spending
    let status, statusClass, progressClass;
    if (metrics.spentPercentage < 70) {
        status = '🟢 On Track';
        statusClass = '';
        progressClass = '';
    } else if (metrics.spentPercentage < 90) {
        status = '🟡 Watch Spending';
        statusClass = 'warning';
        progressClass = 'warning';
    } else {
        status = '🔴 Over Budget';
        statusClass = 'danger';
        progressClass = 'danger';
    }

    // Update elements
    budgetStatus.textContent = status;
    budgetStatus.className = `budget-status ${statusClass}`;

    progressFill.style.width = `${Math.min(metrics.spentPercentage, 100)}%`;
    progressFill.className = `progress-fill ${progressClass}`;

    spentPercentage.textContent = `${metrics.spentPercentage}%`;
    daysRemaining.textContent = metrics.daysRemaining;
    budgetPerDay.textContent = formatCurrency(metrics.budgetPerDay, metrics.currency);
    remainingBudget.textContent = formatCurrency(metrics.remaining, metrics.currency);

    // Show the budget overview
    budgetOverview.style.display = 'block';
}

// Toggle day transactions visibility
function toggleDay(date) {
    const dayElement = document.getElementById(`day-${date}`);
    if (dayElement.style.display === 'none') {
        dayElement.style.display = 'block';
    } else {
        dayElement.style.display = 'none';
    }
}

// Make toggleDay available globally
window.toggleDay = toggleDay;

// Load all cached data from the API
async function loadData() {
    try {
        showStatus('Loading transaction data...', 'loading');

        // Fetch all cached data without date filters
        const response = await fetch(`${API_BASE_URL}/api/transactions`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to load transactions');
        }

        const data = await response.json();

        // Debug: Check what data we received
        console.log('📊 Frontend received data:', data);
        console.log('💰 Balance data:', data.balance);

        // Render the data
        renderSummary(data);
        renderAnalytics(data);
        renderForecastAndRecommendations(data);
        renderDailyTotals(data);

        // Update cache info if available
        updateCacheInfo(data);

        showStatus(
            `Loaded ${data.transactions.length} transaction${data.transactions.length !== 1 ? 's' : ''} from cache`,
            'success'
        );

        // Hide status after 3 seconds
        setTimeout(hideStatus, 3000);

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, 'error');

        // Show empty state
        dailyTotalsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h2>Failed to load transactions</h2>
                <p>${error.message}</p>
                ${error.message.includes('Data not available') ? '<p><small>The server may still be starting up. Please wait a moment and refresh the page.</small></p>' : ''}
            </div>
        `;
    }
}

// Update cache information display
function updateCacheInfo(data) {
    if (data.lastUpdated && data.dataWindow) {
        const lastUpdated = new Date(data.lastUpdated).toLocaleString();
        const dataWindow = `${data.dataWindow.start} to ${data.dataWindow.end}`;

        lastUpdatedSpan.textContent = lastUpdated;
        dataWindowSpan.textContent = dataWindow;
        cacheInfoDiv.style.display = 'block';
    }
}

// Resync data from Wise API
async function resyncData() {
    try {
        // Disable button and show loading state
        resyncBtn.disabled = true;
        resyncBtn.innerHTML = '⏳';
        showStatus('Fetching latest data from Wise API...', 'loading');

        // Make resync request
        const response = await fetch(`${API_BASE_URL}/api/resync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to resync data');
        }

        const result = await response.json();

        showStatus(
            `Data refreshed! ${result.transactionCount} transactions across ${result.dayCount} days`,
            'success'
        );

        // Automatically reload data to update the display
        setTimeout(() => {
            loadData();
        }, 1000);

        // Hide status after 3 seconds
        setTimeout(hideStatus, 4000);

    } catch (error) {
        console.error('Resync error:', error);
        showStatus(`Resync failed: ${error.message}`, 'error');
    } finally {
        // Re-enable button
        resyncBtn.disabled = false;
        resyncBtn.innerHTML = '🔄';
    }
}

// Settings Modal Functions
function openSettingsModal() {
    loadCurrentSettings();
    settingsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function loadCurrentSettings() {
    try {
        showStatus('Loading current settings...', 'loading');

        const response = await fetch(`${API_BASE_URL}/api/settings`);
        if (!response.ok) {
            throw new Error('Failed to load settings');
        }

        const settings = await response.json();
        startDateInput.value = settings.dataStartDate;
        endDateInput.value = settings.dataEndDate;

        hideStatus();
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus(`Error loading settings: ${error.message}`, 'error');
    }
}

async function saveSettings() {
    try {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        if (!startDate || !endDate) {
            showStatus('Please fill in both start and end dates', 'error');
            return;
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            showStatus('Start date must be before end date', 'error');
            return;
        }

        // Disable save button and show loading
        saveSettingsBtn.disabled = true;
        saveSettingsBtn.innerHTML = '<span class="loading-spinner"></span>Saving...';

        showStatus('Updating settings and refreshing data...', 'loading');

        const response = await fetch(`${API_BASE_URL}/api/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dataStartDate: startDate,
                dataEndDate: endDate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }

        const result = await response.json();

        showStatus(
            `Settings saved! Loaded ${result.transactionCount} transactions across ${result.dayCount} days`,
            'success'
        );

        // Close modal
        closeSettingsModal();

        // Reload data to update the display
        setTimeout(() => {
            loadData();
        }, 1000);

        // Hide status after 4 seconds
        setTimeout(hideStatus, 4000);

    } catch (error) {
        console.error('Settings save error:', error);
        showStatus(`Failed to save settings: ${error.message}`, 'error');
    } finally {
        // Re-enable save button
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.innerHTML = 'Save & Refresh Data';
    }
}

// Event listeners
resyncBtn.addEventListener('click', resyncData);
settingsBtn.addEventListener('click', openSettingsModal);
closeSettingsBtn.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);
saveSettingsBtn.addEventListener('click', saveSettings);

// Close modal when clicking outside
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        closeSettingsModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
        closeSettingsModal();
    }
});

// Check server health on load
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const health = await response.json();

        if (!health.configured) {
            showStatus(
                'Server not configured. Please set up your .env file with Wise API credentials.',
                'error'
            );
        }
    } catch (error) {
        showStatus(
            'Cannot connect to server. Make sure the server is running on port 3000.',
            'error'
        );
    }
}

// Initialize the app
checkHealth();
loadData();
