# MK Money Manager — Product Blueprint

**Author:** Mohamed
**Date:** February 14, 2026
**Stack:** React Native · Node.js/Express · PostgreSQL · Plaid API

---

## Vision

A YNAB-inspired mobile app that connects to real bank accounts via Plaid, giving you full control over every dollar through envelope budgeting — while going further with net worth tracking, income analysis, tax awareness, and goal projections. Built for personal use first, designed to scale.

---

## Design Direction: Spatial / Room-Based

**Core metaphor:** Your budget is a **financial house**. Each spending category is a **room** you can walk through. You see at a glance which rooms are **crowded** (overspent) or **sparse** (underspent). You navigate your budget by exploring rooms.

- **Crowded room** = overspent category. The room feels full, heavy, “too much going on” — immediate visual and emotional cue to rebalance.
- **Sparse room** = underspent or on-track category. The room has space; money is available there.
- **Ready to assign** = the “entry hall” or “vault” — unassigned money before it’s allocated to rooms.
- **Navigation:** Move through the house (category groups can be floors or wings). Tap a room to see details, assign money, or move money between rooms.

**Implementation approach:**

1. **Phase 1 (2D):** Room cards or a 2D floor plan. Each category is a room with:
   - Name and optional icon
   - “Fullness” or “crowding” visual (e.g. progress bar as clutter vs space, or abstract “room density”)
   - Color/tone: crowded = warning (e.g. warm/red), sparse = calm (e.g. cool/green or neutral)
2. **Phase 2 (optional 3D):** True 3D house you walk through (e.g. WebGL/React Three Fiber or native 3D). Rooms scale or change appearance by spent vs assigned; overspent rooms look visually “stuffed,” underspent “empty.”

**Copy and UI language:** Use “rooms,” “house,” “assign to a room,” “this room is over budget” instead of (or alongside) “categories” and “overspent” where it fits. Tab or home can be “House” or “Your financial house.”

---

**Debt as clutter and locked doors:** Debt lives inside the same financial-house metaphor. It is physical clutter or locked areas that make the house feel less spacious.

- **Credit card debt** = boxes stacked in rooms, blocking space. The more you owe, the more boxes; each payment removes clutter and frees space.
- **Student loans (and other loans)** = entire locked wings or doors. You can't fully use that part of the house until you pay down the balance; each payment unlocks more, making the house more breathable.
- **Copy and UI:** Use "clutter," "boxes," "locked wing," "unlock," "clear space," "pay to unlock." Net worth / debt views can show "What's blocking your house" with credit as "Boxes" and loans as "Locked wings," and frame payments as "Remove clutter" / "Unlock doors."

---

## Plaid Integration Map

Plaid offers several products you can leverage. Here's what's relevant and what each unlocks:

| Plaid Product | What It Gives You | Your Feature |
|---|---|---|
| **Transactions** | Categorized spending data, merchant info, recurring detection | Auto-import transactions, smart categorization, subscription tracking |
| **Auth** | Account & routing numbers | ACH transfers between your own accounts |
| **Balance** | Real-time account balances | Dashboard balances, net worth calculation |
| **Investments** | Holdings, securities, cost basis | Investment tracking, net worth with market values |
| **Liabilities** | Loans, credit cards, mortgages (balances, rates, minimums) | Debt payoff tracking, interest cost projections |
| **Income** | Employer, pay frequency, income history | Income verification, tax bracket estimation |
| **Recurring Transactions** | Detected subscriptions and recurring charges | Subscription manager, bill calendar |

**Note:** Plaid's v2 Personal Finance Categories (available since Dec 2025) provide AI-enhanced categorization — use this for automatic transaction tagging.

**Apple Card (FinanceKit):** Apple Card is **not** supported by Plaid. It is exposed to apps via **Apple’s FinanceKit** on iOS (used by YNAB, Monarch, etc.). To support Apple Card in this app, implement a native FinanceKit integration (entitlement, Swift/RN bridge, sync balances and transactions to backend); Plaid Link will not show or connect Apple Card.

---

## Feature Set (Phased)

### Phase 1 — Core Foundation

These are the must-haves to get a working app you'll actually use daily.

**1. Bank Account Linking (Plaid Link)**
- Plaid Link integration in React Native for secure bank connection
- Support for checking, savings, and credit card accounts
- Auto-refresh balances and transactions on a schedule
- Handle re-authentication when Plaid items expire

**2. Envelope Budgeting Engine (YNAB-Style)**
- "Give Every Dollar a Job" — assign all available money to categories
- Budget categories fully customizable (groups and sub-categories)
- Money moves freely between envelopes (roll with the punches)
- Carry-over: unspent money rolls to next month per category
- Overspent categories highlighted with clear visual warnings
- "Ready to Assign" balance always visible — the core number
- Monthly and weekly budget views

**3. Transaction Management**
- Auto-import from Plaid with smart categorization
- Manual transaction entry for cash spending
- Split transactions across multiple categories
- Approve/edit imported transactions (match with manual entries)
- Search and filter by date, category, merchant, amount
- Recurring transaction detection and flagging

**4. Dashboard**
- "Ready to Assign" prominently displayed
- Account balances at a glance (on-budget vs. tracking accounts)
- Spending vs. budget progress bars per category
- Monthly spending summary
- Quick-add transaction button

**5. Account Overview**
- All linked accounts in one view
- On-budget accounts (checking, savings) vs. tracking accounts (investments, mortgages)
- Running balance per account
- Reconciliation flow (match your balance against the bank)

---

### Phase 2 — Financial Intelligence

Once the core works, add the features that make this smarter than YNAB.

**6. Net Worth Tracker**
- Assets (bank accounts, investments, property values) minus liabilities (loans, credit cards, mortgages)
- Historical net worth chart (daily/weekly/monthly snapshots)
- Breakdown by account type
- Plaid Investments integration for real-time portfolio values
- Manual asset entries for things Plaid can't track (car, home equity)

**7. Income Tracking & Analysis**
- Track income from multiple sources (salary, freelance, side projects)
- Income categorization (W-2, 1099, passive, etc.)
- Monthly/quarterly/annual income views
- Income trends and year-over-year comparison
- Plaid Income data for payroll verification

**8. Tax Awareness Module**
- Estimated tax bracket based on YTD income
- Tax-deductible expense flagging (business meals, home office, etc.)
- Quarterly estimated tax reminders for self-employment income
- Annual tax summary exportable for your accountant
- Track pre-tax vs. post-tax income
- Category-level tax tagging (deductible, partially deductible, not deductible)

**9. Debt Payoff Planner**
- Pull loan data from Plaid Liabilities (balances, rates, minimums)
- Snowball vs. avalanche payoff strategies with projections
- "Extra payment" simulator — see how paying $X more saves $Y in interest
- Payoff timeline visualization
- Credit card utilization tracking

**10. Subscription & Bill Manager**
- Auto-detect recurring charges via Plaid Recurring Transactions
- Bill calendar with upcoming due dates
- Annual cost view (see what subscriptions cost you per year)
- Cancel reminders for trials
- Notify on price changes or unexpected charges

---

### Phase 3 — Goals & Projections

The forward-looking features that help you plan, not just track.

**11. Savings Goals**
- Create named goals with target amounts and deadlines
- Auto-calculate monthly contribution needed
- Visual progress (progress bar + projected completion date)
- Fund goals from specific envelopes
- Priority ranking — fund goals in order when money comes in
- Goal templates (emergency fund = 3-6 months expenses, vacation, car, etc.)

**12. Financial Goal Projections**
- "What if" scenarios: what if I increase savings by $200/month?
- Retirement projection based on current savings rate + investments
- Home purchase readiness calculator
- Time-to-goal projections updated in real-time as spending changes
- Monte Carlo simulation for investment growth projections

**13. Age Your Money**
- YNAB's "age of money" metric — how many days between earning and spending
- Trend chart showing if you're getting ahead or falling behind
- Milestone celebrations (30-day money age, 60-day, etc.)

**14. Reports & Insights**
- Spending by category (pie/bar charts, trend lines)
- Income vs. expenses over time
- Net worth growth
- Budget performance (how often do you stay on budget per category?)
- "Money age" trend
- Custom date ranges
- Export to CSV/PDF

---

### Phase 4 — Polish & Scale

Features for when you're ready to share this with others.

**15. Multi-User & Shared Budgets**
- Partner/family sharing with role-based access
- Shared budget categories with individual spending visibility
- Activity feed showing who assigned/spent what

**16. Notifications & Alerts**
- Push notifications for: large transactions, low balance, overspent category, bill due, goal milestone reached
- Customizable thresholds per alert type
- Weekly/monthly summary digest

**17. Data Security & Privacy**
- Plaid access tokens encrypted at rest
- Biometric auth (Face ID / fingerprint) for app access
- No selling of user data — this is a core value
- Option to delete all data and revoke Plaid access

**18. Widgets & Quick Actions**
- iOS/Android home screen widgets showing balance, ready-to-assign, spending today
- Quick-add transaction from widget
- Siri/Google Assistant shortcuts

---

## Technical Architecture

### Frontend (React Native)

```
src/
├── screens/
│   ├── Dashboard/
│   ├── Budget/
│   ├── Accounts/
│   ├── Transactions/
│   ├── Goals/
│   ├── Reports/
│   ├── NetWorth/
│   └── Settings/
├── components/
│   ├── common/          # Buttons, cards, modals
│   ├── budget/          # Envelope cards, category rows
│   ├── transactions/    # Transaction list, split modal
│   └── charts/          # Net worth, spending, trends
├── navigation/
│   └── AppNavigator.tsx # Tab + stack navigation
├── store/               # State management
│   ├── slices/          # Budget, accounts, transactions, goals
│   └── store.ts
├── services/
│   ├── api.ts           # Backend API client
│   ├── plaid.ts         # Plaid Link handler
│   └── notifications.ts
├── hooks/               # Custom hooks
├── utils/               # Formatters, calculators, date helpers
└── types/               # TypeScript interfaces
```

**Key Libraries:**
- **Navigation:** React Navigation (tab bar + stacks)
- **State:** Zustand or Redux Toolkit (Zustand recommended for simplicity)
- **Charts:** Victory Native or react-native-chart-kit
- **Plaid:** react-native-plaid-link-sdk
- **Local storage:** react-native-mmkv (fast key-value store)
- **Animations:** react-native-reanimated
- **Forms:** react-hook-form + zod validation

### Backend (Node.js + Express)

```
server/
├── routes/
│   ├── auth.ts          # Login, register, JWT
│   ├── plaid.ts         # Link token, exchange, webhooks
│   ├── accounts.ts      # Account CRUD
│   ├── transactions.ts  # Transaction sync, categorize, split
│   ├── budget.ts        # Categories, assignments, transfers
│   ├── goals.ts         # Savings goals CRUD
│   └── reports.ts       # Aggregation queries
├── services/
│   ├── plaid.service.ts # Plaid API wrapper
│   ├── sync.service.ts  # Transaction sync engine
│   ├── budget.service.ts # Envelope logic
│   └── projection.service.ts # Goal/retirement projections
├── models/              # Database models (Prisma or TypeORM)
├── middleware/           # Auth, rate limiting, error handling
├── jobs/                # Cron jobs (balance refresh, recurring detection)
└── webhooks/            # Plaid webhook handlers
```

**Key decisions:**
- **ORM:** Prisma (great TypeScript support, migrations)
- **Auth:** JWT with refresh tokens + biometric on mobile
- **Job queue:** Bull or Agenda for scheduled Plaid syncs
- **Hosting:** Start with a VPS (Railway, Render) or serverless (Vercel + Supabase)

### Database Schema (Core Tables)

```
users
├── id, email, password_hash, name, created_at

plaid_items
├── id, user_id, access_token (encrypted), institution_name, status

accounts
├── id, user_id, plaid_item_id, name, type, subtype
├── current_balance, available_balance, is_on_budget

transactions
├── id, account_id, plaid_transaction_id
├── amount, date, merchant_name, category_id
├── is_manual, is_approved, is_split, notes

budget_categories
├── id, user_id, group_name, name, sort_order, is_hidden

budget_assignments
├── id, category_id, month (YYYY-MM), assigned_amount

goals
├── id, user_id, category_id, name
├── target_amount, target_date, monthly_contribution

net_worth_snapshots
├── id, user_id, date, total_assets, total_liabilities

income_entries
├── id, user_id, source_name, type (W2/1099/passive)
├── amount, date, is_taxable, tax_category

recurring_transactions
├── id, user_id, merchant, amount, frequency, next_date
```

### Plaid Integration Flow

```
1. User taps "Link Account"
2. App creates a link_token via your backend → Plaid API
3. Plaid Link SDK opens in-app (secure bank login)
4. On success, frontend sends public_token to your backend
5. Backend exchanges public_token → access_token (store encrypted)
6. Backend calls /transactions/sync for initial transaction pull
7. Set up Plaid webhooks for ongoing updates:
   - TRANSACTIONS_SYNC: new/modified/removed transactions
   - ITEM: connection status changes (re-auth needed)
   - HOLDINGS: investment value updates
8. Cron job refreshes balances daily via /accounts/balance/get
```

---

## Monetization Ideas (If You Scale)

- **Free tier:** 2 linked accounts, basic budgeting, 3 months history
- **Premium ($5-8/month):** Unlimited accounts, net worth, goals, projections, tax tools, reports, export
- **Family plan:** Shared budgets for 2-5 users

---

## Development Roadmap

| Phase | Timeline | Milestone |
|---|---|---|
| **Phase 1** | Weeks 1-6 | Core budgeting + Plaid link + transactions + dashboard |
| **Phase 2** | Weeks 7-12 | Net worth + income tracking + tax tools + debt planner |
| **Phase 3** | Weeks 13-16 | Goals + projections + reports + age your money |
| **Phase 4** | Weeks 17-20 | Multi-user + notifications + widgets + polish |
| **Beta** | Week 21+ | TestFlight / internal testing, iterate on feedback |

---

## Getting Started Checklist

*(For greenfield setup; current app uses Expo + Convex.)*

- [ ] Set up React Native project with TypeScript (`npx react-native init MKMoney --template react-native-template-typescript`)
- [ ] Install and configure `react-native-plaid-link-sdk`
- [ ] Set up backend with Express + Prisma + PostgreSQL
- [ ] Implement Plaid Link flow (link_token → exchange → store access_token)
- [ ] Build first screen: account list with real balances from Plaid
- [ ] Build transaction list with Plaid sync
- [ ] Implement envelope budgeting engine (the hard part — get this right)
- [ ] Build budget screen with category assignments
- [ ] Dashboard with "Ready to Assign" calculation
- [ ] Iterate from there

---

## Implementation Checklist (vs current app)

Tick as you ship. Order reflects suggested priority within each phase.

### Phase 1 — Core foundation

- [ ] **Carry-over / rollover** — Unspent per category rolls to next month (backend: compute prior month “available” and add to this month’s assigned or show as starting balance; UI: optional indicator “Includes $X from last month”).
- [ ] **Move money between envelopes** — Dedicated “Move” flow: pick source category, target category, amount; backend: `transferBetweenCategories(fromCategoryId, toCategoryId, month, amountCents)` (decrement one assignment, increment other); UI: button on budget or room card “Move to another room”.
- [ ] **Weekly budget view** — Optional view: show category assigned vs spent for current week (or “week so far”); backend: filter transactions by week; UI: toggle or tab “Month | Week”.
- [ ] **Split transactions** — One transaction → multiple categories. Backend: either `transaction_splits` table (transactionId, categoryId, amountCents) or store first split on transaction + child records; UI: “Split” on transaction detail, assign portions to categories.
- [ ] **Approve / edit imported transactions** — New imports start as `isApproved: false`; list “Pending” on transactions screen; user can approve or edit category/amount then approve; backend: mutation `approveTransaction(id)` and optional `updateTransaction(id, ...)`.
- [ ] **Recurring transaction detection** — Use Plaid Recurring Transactions and/or detect by merchant + amount in app; store in `recurring_transactions` (or similar); flag transactions in list as “Recurring” and show in bill/subscription view.
- [ ] **Scheduled Plaid refresh** — Convex cron (or external cron calling Convex) to run balance + transaction sync daily (e.g. `convex/crons.ts` or Convex dashboard cron); call existing `refreshPlaidBalancesAndLiabilities` and transaction sync per item.
- [ ] **Plaid webhooks** — HTTP endpoint for Plaid: TRANSACTIONS_SYNC (trigger transaction sync for item), ITEM (update status / set needs_reauth), optionally HOLDINGS; persist cursor/state per item as needed.

### Phase 2 — Financial intelligence

- [ ] **Plaid Investments** — Add Investments product; fetch holdings, map to accounts or new `holdings` table; include in net worth and dashboard.
- [ ] **Manual asset entries** — Table e.g. `manual_assets` (name, type, value, date); include in net worth summary and history.
- [ ] **Income categorization** — Add W-2 / 1099 / passive (and tax-related) fields to income sources/entries; optional Plaid Income for verification.
- [ ] **Tax awareness module** — Estimated tax bracket from YTD income; category-level tax tagging (deductible / not); quarterly reminder for estimated tax; annual summary export (CSV/PDF).
- [ ] **Subscription & bill manager (Plaid Recurring)** — Ingest Plaid Recurring into bill calendar; due dates, annual cost view, alerts for trials/price changes.

### Phase 3 — Goals & projections

- [ ] **Savings goals UI** — Screen: create goal (name, target amount, target date), link to category optional; show progress bar and “fund from envelope”; backend: use existing `goals` table; mutations for create/update/delete and “add to goal” from category.
- [ ] **Financial goal projections** — “What if” (e.g. save $X more/month → goal date); retirement or home-buying calculator (optional).
- [ ] **Age your money** — Metric: days between income and spending (YNAB-style); store or compute from income/transaction dates; trend chart and milestones (30/60 days).
- [ ] **Reports & insights** — Spending by category (pie/bar), income vs expenses over time, net worth growth; custom date range; export CSV/PDF.

### Phase 4 — Polish & scale

- [ ] **Multi-user / shared budgets** — Shared budget entity, roles, activity feed (who assigned/spent what).
- [ ] **Notifications & alerts** — Push: large transaction, low balance, overspent category, bill due, goal milestone; configurable thresholds.
- [ ] **Biometric app lock** — Face ID / fingerprint to unlock app (e.g. expo-local-authentication).
- [ ] **Widgets & quick actions** — Home screen widget (balance, ready-to-assign); Siri/shortcuts for quick-add transaction.

### Design & copy

- [ ] **“House” / “Your financial house”** — Consider “House” tab or subtitle; use “assign to a room” / “this room is over budget” in copy where it fits.
- [ ] **Debt as clutter / locked doors** — Use “boxes,” “locked wing,” “unlock,” “clear space” in debt and net worth views.
- [ ] **Apple Card (FinanceKit)** — If desired: native FinanceKit integration for Apple Card (separate from Plaid).

---

## Concrete tasks — Phase 1 (backend + UI)

Use these as a first batch; implement in this order for maximum impact.

### 1. Carry-over (rollover)

- **Backend (Convex):**
  - In `getDashboard` (or a helper), for each category compute “previous month available” = `assigned(prevMonth) - spent(prevMonth)` (clamp ≥ 0).
  - Either: (A) add that to “assigned” for current month in the API (so “assigned” = rollover + user assignments), or (B) return `rolloverCents` per category and add it in the UI to “available.”
  - Document: “Available = assigned + rollover − spent” and “Ready to Assign” stays based on on-budget accounts − total assigned (assignments only, not rollover), or include rollover in a single definition and keep it consistent.
- **UI:**
  - On budget screen / RoomCard, show “Includes $X from last month” when rollover > 0.
  - Optional: in dashboard, one line “Rolled over from last month: $X” (sum of rollovers).

### 2. Move money between envelopes

- **Backend (Convex):**
  - New mutation `transferBetweenCategories({ fromCategoryId, toCategoryId, month, amountCents })`: resolve both assignments for `month`, subtract `amountCents` from fromCategory (clamp to 0), add to toCategory (create assignment if missing). Require same userId for both categories.
- **UI:**
  - On budget screen: “Move” or “Move money” button (global or per room).
  - Modal: “From” category dropdown, “To” category dropdown, amount input; submit calls `transferBetweenCategories`. Show success toast and refresh dashboard.

### 3. Split transactions

- **Backend (Convex):**
  - Add table e.g. `transactionSplits`: `transactionId`, `categoryId`, `amountCents` (all required). For split txns, `transactions.isSplit === true` and sum(splits) === transaction amount.
  - Mutations: `createSplit(transactionId, splits[])` (replace any existing splits), `deleteSplits(transactionId)`.
  - In `getDashboard` (and any “spent per category” query), for split txns use `transactionSplits` to attribute amounts to categories instead of `transaction.categoryId`.
- **UI:**
  - Transaction detail: “Split” button; modal to add 2+ lines (category + amount), total must match transaction amount; save calls `createSplit`. List view: show “Split” badge and optionally category names.

### 4. Approve / edit imported transactions

- **Backend (Convex):**
  - When writing Plaid transactions, set `isApproved: false` (or a dedicated `pendingImport: true` if you prefer). Add mutation `approveTransaction(id)` (set isApproved true) and ensure `updateTransaction` (or new) can edit category, amount, merchant, date for pending.
  - Query: `listPendingTransactions()` for current user (optional limit).
- **UI:**
  - Transactions: section “Pending” at top (or filter “Pending”) with approve + edit; after edit/approve, remove from pending.

### 5. Scheduled Plaid refresh

- **Backend (Convex):**
  - Add Convex cron (e.g. in `convex.json` or dashboard): daily at 4am run a function that calls `internal.plaid.refreshAllItemsForAllUsers` (or new internal action that loops users/items and runs existing refresh + transaction sync). Implement that internal action if it doesn’t exist: get all items with access tokens, call refresh + sync for each.
- **Docs:** Note in README or convex comments that production uses cron for automatic refresh.

### 6. Plaid webhooks

- **Backend (Convex):**
  - Add HTTP route (Convex HTTP action) for Plaid webhook: verify signature, parse payload (TRANSACTIONS_SYNC, ITEM, etc.); for TRANSACTIONS_SYNC trigger sync for that item (reuse existing sync logic); for ITEM update item status / set needs_reauth. Register webhook URL in Plaid dashboard.
- **Docs:** Document webhook URL and required env (e.g. PLAID_WEBHOOK_SECRET).

---

*This is your blueprint. Start with Phase 1, get it working for yourself, and let real usage guide what to prioritize next.*
