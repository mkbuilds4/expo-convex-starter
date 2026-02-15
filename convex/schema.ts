import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Demo (optional — can remove when fully on money manager)
  tasks: defineTable({
    title: v.string(),
    completed: v.boolean(),
    userId: v.string(),
  }).index('by_user', ['userId']),

  // ——— Money Manager ———

  // Linked bank items (Plaid: access_token stored server-side only)
  plaidItems: defineTable({
    userId: v.string(),
    institutionName: v.string(),
    status: v.string(), // 'active' | 'needs_reauth' | etc.
    accessToken: v.optional(v.string()), // Plaid access_token; set in Convex env for encryption at rest
    transactionsSyncCursor: v.optional(v.string()), // for /transactions/sync pagination
  }).index('by_user', ['userId']),

  // Bank/credit accounts (depository = checking/savings; credit/loan = debt)
  accounts: defineTable({
    userId: v.string(),
    plaidItemId: v.optional(v.id('plaidItems')),
    plaidAccountId: v.optional(v.string()), // Plaid account_id for refresh matching
    name: v.string(),
    type: v.string(), // 'depository' | 'credit' | 'investment' | 'loan'
    subtype: v.string(), // 'checking' | 'savings' | 'credit card' | etc.
    currentBalance: v.number(), // in cents (for credit/loan = amount owed)
    availableBalance: v.optional(v.number()),
    isOnBudget: v.boolean(), // legacy; Ready to Assign uses depository type only
    sortOrder: v.number(),
    // Debt tracking (for type credit | loan)
    interestRate: v.optional(v.number()), // e.g. 0.18 for 18% APR
    minimumPayment: v.optional(v.number()), // cents per month
    nextPaymentDueDate: v.optional(v.string()), // YYYY-MM-DD
  })
    .index('by_user', ['userId'])
    .index('by_plaid_item', ['plaidItemId']),

  // Net worth history (for charts / trends)
  netWorthSnapshots: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    totalAssets: v.number(),
    totalLiabilities: v.number(),
    netWorth: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_date', ['userId', 'date']),

  // Transactions (amount in cents; negative = outflow)
  transactions: defineTable({
    accountId: v.id('accounts'),
    amount: v.number(), // cents, negative for spending
    date: v.string(), // YYYY-MM-DD
    merchantName: v.string(),
    categoryId: v.optional(v.id('budgetCategories')),
    isManual: v.boolean(),
    isApproved: v.boolean(),
    isSplit: v.boolean(),
    notes: v.optional(v.string()),
    plaidTransactionId: v.optional(v.string()),
  })
    .index('by_account', ['accountId'])
    .index('by_account_date', ['accountId', 'date'])
    .index('by_category', ['categoryId'])
    .index('by_date', ['date'])
    .index('by_plaid_transaction_id', ['plaidTransactionId']),

  // Budget category groups and categories
  budgetCategories: defineTable({
    userId: v.string(),
    groupName: v.string(), // e.g. "Fixed", "Variable", "Savings"
    name: v.string(),
    sortOrder: v.number(),
    isHidden: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_order', ['userId', 'sortOrder']),

  // Assigned amount per category per month (envelope "filled" amount)
  budgetAssignments: defineTable({
    categoryId: v.id('budgetCategories'),
    month: v.string(), // YYYY-MM
    assignedAmount: v.number(), // cents
  })
    .index('by_category', ['categoryId'])
    .index('by_category_month', ['categoryId', 'month'])
    .index('by_month', ['month']),

  // Savings goals (Phase 3 — structure in place)
  goals: defineTable({
    userId: v.string(),
    categoryId: v.optional(v.id('budgetCategories')),
    name: v.string(),
    targetAmount: v.number(),
    targetDate: v.optional(v.string()),
    monthlyContribution: v.optional(v.number()),
    currentAmount: v.number(),
  }).index('by_user', ['userId']),

  // Debt payoff game: target date & starting snapshot for progress
  debtPayoffPlans: defineTable({
    userId: v.string(),
    targetDate: v.string(), // YYYY-MM-DD
    startedTotalDebtCents: v.optional(v.number()), // snapshot when plan was set
    monthlyExtraCents: v.optional(v.number()), // extra $ toward debt each month
  }).index('by_user', ['userId']),

  // Recurring monthly expenses (bills) for income target
  recurringBills: defineTable({
    userId: v.string(),
    name: v.string(),
    amount: v.number(), // cents per month
    dueDay: v.number(), // 1-31
    sortOrder: v.number(),
  }).index('by_user', ['userId']),

  // Income sources (salary, freelance, etc.) — amount per period
  incomeSources: defineTable({
    userId: v.string(),
    name: v.string(),
    amount: v.number(), // cents per period
    frequency: v.string(), // 'weekly' | 'biweekly' | 'monthly' | 'annual'
    type: v.optional(v.string()), // 'salary' | 'freelance' | 'gig' | 'other'
    sortOrder: v.number(),
  }).index('by_user', ['userId']),

  // Potential jobs/opportunities for forecasting
  incomeForecasts: defineTable({
    userId: v.string(),
    name: v.string(),
    amount: v.number(), // cents
    kind: v.string(), // 'one-time' | 'recurring'
    frequency: v.optional(v.string()), // 'weekly' | 'biweekly' | 'monthly' | 'annual' when recurring
    sortOrder: v.number(),
  }).index('by_user', ['userId']),
});
