/**
 * Plaid integration: link token creation and public token exchange.
 * Set in Convex dashboard (Settings → Environment Variables):
 * - PLAID_CLIENT_ID, PLAID_SECRET (required)
 * - PLAID_BASE_URL (optional): use "https://production.plaid.com" for production;
 *   omit or leave unset for sandbox (https://sandbox.plaid.com).
 * Use sandbox secret for dev, production secret + PLAID_BASE_URL for production.
 */

import { action, internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';

const PLAID_SANDBOX = 'https://sandbox.plaid.com';
const PLAID_PRODUCTION = 'https://production.plaid.com';

function getPlaidBaseUrl(): string {
  const base = process.env.PLAID_BASE_URL?.trim();
  if (base && (base === PLAID_PRODUCTION || base.startsWith('https://production.plaid.com')))
    return PLAID_PRODUCTION;
  return PLAID_SANDBOX;
}

async function getAuthUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

/**
 * Internal: return Plaid items with access tokens for a user (for refresh).
 */
export const getItemsWithTokensForUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return items
      .filter((i) => i.accessToken != null)
      .map((i) => ({
        itemId: i._id,
        accessToken: i.accessToken!,
        transactionsSyncCursor: i.transactionsSyncCursor ?? undefined,
      }));
  },
});

/** Plaid institution IDs look like "ins_123". */
function isInstitutionId(name: string): boolean {
  return /^ins_\d+$/i.test(name.trim());
}

/**
 * List linked Plaid items (banks) for the current user. Only includes items that have at least
 * one account in the app, so stale/orphan links are hidden. Display name uses institution name
 * when available, otherwise the account names (e.g. "Checking, Savings") so you can tell which is which.
 */
export const listLinkedPlaidItems = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;
    const items = await ctx.db
      .query('plaidItems')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const result: { itemId: typeof items[0]['_id']; institutionName: string }[] = [];
    for (const i of items) {
      if (i.accessToken == null) continue;
      const accounts = await ctx.db
        .query('accounts')
        .withIndex('by_plaid_item', (q) => q.eq('plaidItemId', i._id))
        .collect();
      if (accounts.length === 0) continue;
      const realName = (i.institutionName || '').trim();
      const displayName = isInstitutionId(realName)
        ? accounts.map((a) => a.name).join(', ')
        : realName || accounts.map((a) => a.name).join(', ');
      result.push({ itemId: i._id, institutionName: displayName });
    }
    return result;
  },
});

/**
 * Internal: update a single account with refreshed balance/liability from Plaid.
 */
export const updateAccountFromPlaid = internalMutation({
  args: {
    accountId: v.id('accounts'),
    userId: v.string(),
    currentBalance: v.optional(v.number()),
    availableBalance: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    minimumPayment: v.optional(v.number()),
    nextPaymentDueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const acc = await ctx.db.get(args.accountId);
    if (!acc || acc.userId !== args.userId) return;
    const updates: Record<string, unknown> = {};
    if (args.currentBalance !== undefined) updates.currentBalance = args.currentBalance;
    if (args.availableBalance !== undefined) updates.availableBalance = args.availableBalance;
    if (args.interestRate !== undefined) updates.interestRate = args.interestRate;
    if (args.minimumPayment !== undefined) updates.minimumPayment = args.minimumPayment;
    if (args.nextPaymentDueDate !== undefined) updates.nextPaymentDueDate = args.nextPaymentDueDate || undefined;
    if (Object.keys(updates).length > 0) await ctx.db.patch(args.accountId, updates);
  },
});

/** Plaid transaction shape we pass to applyTransactionsSync (Plaid API returns many more fields). */
const plaidTransactionValidator = v.object({
  transaction_id: v.string(),
  account_id: v.string(),
  amount: v.number(),
  date: v.string(),
  name: v.string(),
  merchant_name: v.optional(v.union(v.string(), v.null())),
  pending: v.optional(v.boolean()),
});

type NormalizedPlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending?: boolean;
};

function normalizePlaidTransaction(raw: Record<string, unknown>): NormalizedPlaidTransaction | null {
  if (typeof raw.transaction_id !== 'string' || typeof raw.account_id !== 'string' || typeof raw.date !== 'string' || typeof raw.name !== 'string') return null;
  const amount = typeof raw.amount === 'number' ? raw.amount : Number(raw.amount);
  if (Number.isNaN(amount)) return null;
  return {
    transaction_id: raw.transaction_id,
    account_id: raw.account_id,
    amount,
    date: raw.date,
    name: String(raw.name),
    merchant_name: raw.merchant_name != null ? String(raw.merchant_name) : null,
    pending: typeof raw.pending === 'boolean' ? raw.pending : undefined,
  };
}

/**
 * Internal: apply transaction sync updates and save cursor.
 */
export const applyTransactionsSync = internalMutation({
  args: {
    itemId: v.id('plaidItems'),
    userId: v.string(),
    nextCursor: v.string(),
    added: v.array(plaidTransactionValidator),
    modified: v.array(plaidTransactionValidator),
    removed: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== args.userId) return { inserted: 0, updated: 0, removed: 0 };
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_plaid_item', (q) => q.eq('plaidItemId', args.itemId))
      .collect();
    const plaidToOurAccountId = new Map<string, typeof accounts[0]['_id']>();
    for (const a of accounts) {
      if (a.plaidAccountId) plaidToOurAccountId.set(a.plaidAccountId, a._id);
    }
    let inserted = 0;
    let updated = 0;
    let removedCount = 0;
    for (const t of args.added) {
      const accountId = plaidToOurAccountId.get(t.account_id);
      if (!accountId) continue;
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) => q.eq('plaidTransactionId', t.transaction_id))
        .first();
      if (existing) continue;
      const amountCents = -Math.round(t.amount * 100);
      const merchantName = (t.merchant_name ?? t.name)?.trim() || 'Unknown';
      await ctx.db.insert('transactions', {
        accountId,
        amount: amountCents,
        date: t.date,
        merchantName: merchantName.slice(0, 200),
        isManual: false,
        isApproved: true,
        isSplit: false,
        plaidTransactionId: t.transaction_id,
      });
      inserted++;
    }
    for (const t of args.modified) {
      const accountId = plaidToOurAccountId.get(t.account_id);
      if (!accountId) continue;
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) => q.eq('plaidTransactionId', t.transaction_id))
        .first();
      if (!existing) continue;
      const amountCents = -Math.round(t.amount * 100);
      const merchantName = (t.merchant_name ?? t.name)?.trim() || 'Unknown';
      await ctx.db.patch(existing._id, {
        amount: amountCents,
        date: t.date,
        merchantName: merchantName.slice(0, 200),
      });
      updated++;
    }
    for (const transactionId of args.removed) {
      const existing = await ctx.db
        .query('transactions')
        .withIndex('by_plaid_transaction_id', (q) => q.eq('plaidTransactionId', transactionId))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
        removedCount++;
      }
    }
    await ctx.db.patch(args.itemId, { transactionsSyncCursor: args.nextCursor });
    return { inserted, updated, removed: removedCount };
  },
});

/**
 * Internal: mark a Plaid item as needing re-link (wrong sandbox vs production mode).
 * Clears accessToken so it is no longer used for sync.
 */
export const markPlaidItemNeedsReauth = internalMutation({
  args: { itemId: v.id('plaidItems'), userId: v.string() },
  handler: async (ctx, { itemId, userId }) => {
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== userId) return;
    await ctx.db.patch(itemId, { accessToken: undefined, status: 'needs_reauth' });
  },
});

/**
 * Internal: save Plaid item and its accounts after successful exchange.
 */
export const saveItemAndAccounts = internalMutation({
  args: {
    userId: v.string(),
    institutionName: v.string(),
    accessToken: v.string(),
    accounts: v.array(
      v.object({
        plaidAccountId: v.string(),
        name: v.string(),
        type: v.string(),
        subtype: v.string(),
        currentBalance: v.number(),
        availableBalance: v.optional(v.number()),
        interestRate: v.optional(v.number()),
        minimumPayment: v.optional(v.number()),
        nextPaymentDueDate: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert('plaidItems', {
      userId: args.userId,
      institutionName: args.institutionName,
      status: 'active',
      accessToken: args.accessToken,
    });
    const existing = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
    let sortOrder = existing.length;
    for (const acc of args.accounts) {
      // Accept all account types from Plaid; map legacy brokerage to investment
      const type = (acc.type === 'brokerage' ? 'investment' : acc.type) || 'other';
      await ctx.db.insert('accounts', {
        userId: args.userId,
        plaidItemId: itemId,
        plaidAccountId: acc.plaidAccountId,
        name: acc.name,
        type,
        subtype: acc.subtype || 'other',
        currentBalance: acc.currentBalance,
        availableBalance: acc.availableBalance ?? acc.currentBalance,
        isOnBudget: type === 'depository' || type === 'investment',
        sortOrder: sortOrder++,
        ...(acc.interestRate !== undefined && { interestRate: acc.interestRate }),
        ...(acc.minimumPayment !== undefined && { minimumPayment: acc.minimumPayment }),
        ...(acc.nextPaymentDueDate !== undefined && acc.nextPaymentDueDate !== '' && { nextPaymentDueDate: acc.nextPaymentDueDate }),
      });
    }
    return itemId;
  },
});

/**
 * Create a Plaid Link token for the authenticated user.
 * Requires PLAID_CLIENT_ID and PLAID_SECRET in Convex env.
 */
export const createLinkToken = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      throw new Error(
        'Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to Convex environment variables (Settings → Environment Variables).'
      );
    }
    const baseUrl = getPlaidBaseUrl();
    const res = await fetch(`${baseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        user: { client_user_id: userId },
        client_name: 'Fulus',
        // Transactions only: accept all account types (checking, savings, credit, loan, investment).
        // No account_filters = Link shows every account that supports transactions. Balances are pulled after link via /accounts/get and /accounts/balance/get.
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      }),
    });
    const data = (await res.json()) as { link_token?: string; error_code?: string; error_message?: string };
    if (!res.ok || data.error_code) {
      throw new Error(data.error_message || `Plaid error: ${res.status}`);
    }
    if (!data.link_token) throw new Error('No link_token in response');
    return { linkToken: data.link_token };
  },
});

/**
 * Exchange a Plaid public_token (from Link success) for an access_token,
 * fetch institution and accounts, and save to DB.
 */
export const exchangePublicToken = action({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    const userId = await getAuthUserId(ctx);
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      throw new Error('Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to Convex environment variables.');
    }

    const baseUrl = getPlaidBaseUrl();
    const exchangeRes = await fetch(`${baseUrl}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        secret,
        public_token: publicToken,
      }),
    });
    const exchangeData = (await exchangeRes.json()) as {
      access_token?: string;
      error_code?: string;
      error_message?: string;
    };
    if (!exchangeRes.ok || exchangeData.error_code) {
      throw new Error(exchangeData.error_message || `Exchange failed: ${exchangeRes.status}`);
    }
    const accessToken = exchangeData.access_token;
    if (!accessToken) throw new Error('No access_token in response');

    const itemRes = await fetch(`${baseUrl}/item/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
    });
    const itemData = (await itemRes.json()) as {
      item?: { institution_id?: string };
      institution?: { name?: string } | null;
      error_code?: string;
      error_message?: string;
    };
    const institutionName =
      itemData.institution?.name ?? itemData.item?.institution_id ?? 'Bank';

    const acctRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
    });
    const acctData = (await acctRes.json()) as {
      accounts?: Array<{
        account_id: string;
        name: string;
        type: string;
        subtype: string | null;
        balances?: { current?: number | null; available?: number | null };
      }>;
      error_code?: string;
      error_message?: string;
    };
    if (!acctRes.ok || acctData.error_code) {
      throw new Error(acctData.error_message || 'Failed to get accounts');
    }
    const accountsList = acctData.accounts ?? [];

    // Pull balances for every account: from /accounts/get first, then overlay with /accounts/balance/get when available
    const balancesByAccountId = new Map<string, { current: number; available?: number }>();
    for (const a of accountsList) {
      const cur = a.balances?.current ?? null;
      const avail = a.balances?.available ?? null;
      if (cur != null || avail != null) {
        balancesByAccountId.set(a.account_id, {
          current: cur ?? avail ?? 0,
          available: avail ?? cur ?? 0,
        });
      }
    }

    const balanceRes = await fetch(`${baseUrl}/accounts/balance/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
    });
    const balanceData = (await balanceRes.json()) as {
      accounts?: Array<{
        account_id: string;
        balances?: { current?: number | null; available?: number | null };
      }>;
      error_code?: string;
      error_message?: string;
    };
    if (balanceRes.ok && balanceData.accounts) {
      for (const b of balanceData.accounts) {
        const cur = b.balances?.current ?? null;
        const avail = b.balances?.available ?? null;
        if (cur != null || avail != null) {
          balancesByAccountId.set(b.account_id, {
            current: cur ?? avail ?? 0,
            available: avail ?? cur ?? 0,
          });
        }
      }
    }

    // Liabilities: interest rate, minimum payment, next payment due date (credit cards & loans)
    const liabilityByAccountId = new Map<
      string,
      { interestRate?: number; minimumPayment?: number; nextPaymentDueDate?: string }
    >();
    const liabilitiesRes = await fetch(`${baseUrl}/liabilities/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
    });
    const liabilitiesData = (await liabilitiesRes.json()) as {
      liabilities?: {
        credit?: Array<{
          account_id: string;
          aprs?: Array<{ apr_percentage?: number; apr_type?: string }>;
          minimum_payment?: number | null;
          next_payment_due_date?: string | null;
        }>;
        mortgage?: Array<{
          account_id: string;
          interest_rate_percentage?: number | null;
          next_payment_due_date?: string | null;
          next_payment_amount?: number | null;
        }>;
        student?: Array<{
          account_id: string;
          interest_rate_percentage?: number | null;
          next_payment_due_date?: string | null;
        }>;
      };
      error_code?: string;
      error_message?: string;
    };
    if (liabilitiesRes.ok && liabilitiesData.liabilities) {
      const raw = liabilitiesData.liabilities;
      const credit = Array.isArray(raw.credit) ? raw.credit : [];
      const mortgage = Array.isArray(raw.mortgage) ? raw.mortgage : [];
      const student = Array.isArray(raw.student) ? raw.student : [];
      for (const c of credit) {
        const apr = c.aprs?.[0]?.apr_percentage ?? null;
        const minPay = c.minimum_payment != null ? Math.round(c.minimum_payment * 100) : undefined;
        const due = c.next_payment_due_date ?? undefined;
        if (apr != null || minPay !== undefined || due) {
          liabilityByAccountId.set(c.account_id, {
            interestRate: apr != null ? apr / 100 : undefined,
            minimumPayment: minPay,
            nextPaymentDueDate: due ?? undefined,
          });
        }
      }
      for (const m of mortgage) {
        const rate = m.interest_rate_percentage != null ? m.interest_rate_percentage / 100 : undefined;
        const minPay = m.next_payment_amount != null ? Math.round(m.next_payment_amount * 100) : undefined;
        const due = m.next_payment_due_date ?? undefined;
        if (rate !== undefined || minPay !== undefined || due) {
          liabilityByAccountId.set(m.account_id, {
            interestRate: rate,
            minimumPayment: minPay,
            nextPaymentDueDate: due ?? undefined,
          });
        }
      }
      for (const s of student) {
        const rate = s.interest_rate_percentage != null ? s.interest_rate_percentage / 100 : undefined;
        const due = s.next_payment_due_date ?? undefined;
        if (rate !== undefined || due) {
          liabilityByAccountId.set(s.account_id, {
            interestRate: rate,
            nextPaymentDueDate: due ?? undefined,
          });
        }
      }
    }

    // Save every account type (depository, credit, loan, investment, other) with balances
    const accounts = accountsList.map((a) => {
      const bal = balancesByAccountId.get(a.account_id) ?? { current: 0, available: 0 };
      const liability = liabilityByAccountId.get(a.account_id);
      return {
        plaidAccountId: a.account_id,
        name: a.name,
        type: a.type,
        subtype: a.subtype ?? 'other',
        currentBalance: Math.round((bal.current ?? 0) * 100),
        availableBalance: Math.round((bal.available ?? bal.current ?? 0) * 100),
        ...(liability?.interestRate !== undefined && { interestRate: liability.interestRate }),
        ...(liability?.minimumPayment !== undefined && { minimumPayment: liability.minimumPayment }),
        ...(liability?.nextPaymentDueDate && { nextPaymentDueDate: liability.nextPaymentDueDate }),
      };
    });

    await ctx.runMutation(internal.plaid.saveItemAndAccounts, {
      userId,
      institutionName,
      accessToken,
      accounts,
    });

    return { success: true, accountsCount: accounts.length };
  },
});

/**
 * Refresh balances and liability details (APR, min payment, due date) for all
 * existing linked Plaid accounts. No need to delete or re-add accounts.
 */
export const refreshPlaidBalancesAndLiabilities = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      throw new Error('Plaid is not configured.');
    }
    const baseUrl = getPlaidBaseUrl();
    const items = await ctx.runQuery(internal.plaid.getItemsWithTokensForUser, { userId });
    if (items.length === 0) {
      return { updated: 0, message: 'No linked Plaid items to refresh.' };
    }
    const allAccounts = (await ctx.runQuery(api.accounts.list, {})) ?? [];
    let updated = 0;
    for (const { itemId, accessToken } of items) {
      const myAccounts = allAccounts.filter((a) => a.plaidItemId === itemId);
      if (myAccounts.length === 0) continue;
      const acctRes = await fetch(`${baseUrl}/accounts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
      });
      const acctData = (await acctRes.json()) as {
        accounts?: Array<{
          account_id: string;
          name: string;
          type: string;
          subtype: string | null;
          balances?: { current?: number | null; available?: number | null };
        }>;
        error_code?: string;
      };
      if (!acctRes.ok || acctData.error_code || !acctData.accounts?.length) continue;
      const accountsList = acctData.accounts;
      const balancesByAccountId = new Map<string, { current: number; available?: number }>();
      for (const a of accountsList) {
        const cur = a.balances?.current ?? null;
        const avail = a.balances?.available ?? null;
        if (cur != null || avail != null) {
          balancesByAccountId.set(a.account_id, {
            current: cur ?? avail ?? 0,
            available: avail ?? cur ?? 0,
          });
        }
      }
      const balanceRes = await fetch(`${baseUrl}/accounts/balance/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
      });
      const balanceData = (await balanceRes.json()) as {
        accounts?: Array<{
          account_id: string;
          balances?: { current?: number | null; available?: number | null };
        }>;
      };
      if (balanceRes.ok && balanceData.accounts) {
        for (const b of balanceData.accounts) {
          const cur = b.balances?.current ?? null;
          const avail = b.balances?.available ?? null;
          if (cur != null || avail != null) {
            balancesByAccountId.set(b.account_id, {
              current: cur ?? avail ?? 0,
              available: avail ?? cur ?? 0,
            });
          }
        }
      }
      const liabilityByAccountId = new Map<
        string,
        { interestRate?: number; minimumPayment?: number; nextPaymentDueDate?: string }
      >();
      const liabRes = await fetch(`${baseUrl}/liabilities/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, secret, access_token: accessToken }),
      });
      const liabData = (await liabRes.json()) as {
        liabilities?: {
          credit?: Array<{
            account_id: string;
            aprs?: Array<{ apr_percentage?: number }>;
            minimum_payment?: number | null;
            next_payment_due_date?: string | null;
          }>;
          mortgage?: Array<{
            account_id: string;
            interest_rate_percentage?: number | null;
            next_payment_due_date?: string | null;
            next_payment_amount?: number | null;
          }>;
          student?: Array<{
            account_id: string;
            interest_rate_percentage?: number | null;
            next_payment_due_date?: string | null;
          }>;
        };
      };
      if (liabRes.ok && liabData.liabilities) {
        const raw = liabData.liabilities;
        const credit = Array.isArray(raw?.credit) ? raw.credit : [];
        const mortgage = Array.isArray(raw?.mortgage) ? raw.mortgage : [];
        const student = Array.isArray(raw?.student) ? raw.student : [];
        for (const c of credit) {
          const apr = c.aprs?.[0]?.apr_percentage ?? null;
          liabilityByAccountId.set(c.account_id, {
            interestRate: apr != null ? apr / 100 : undefined,
            minimumPayment: c.minimum_payment != null ? Math.round(c.minimum_payment * 100) : undefined,
            nextPaymentDueDate: c.next_payment_due_date ?? undefined,
          });
        }
        for (const m of mortgage) {
          liabilityByAccountId.set(m.account_id, {
            interestRate: m.interest_rate_percentage != null ? m.interest_rate_percentage / 100 : undefined,
            minimumPayment: m.next_payment_amount != null ? Math.round(m.next_payment_amount * 100) : undefined,
            nextPaymentDueDate: m.next_payment_due_date ?? undefined,
          });
        }
        for (const s of student) {
          liabilityByAccountId.set(s.account_id, {
            interestRate: s.interest_rate_percentage != null ? s.interest_rate_percentage / 100 : undefined,
            nextPaymentDueDate: s.next_payment_due_date ?? undefined,
          });
        }
      }
      for (const acc of myAccounts) {
        const plaidAccount = accountsList.find(
          (p) =>
            acc.plaidAccountId === p.account_id ||
            (acc.name === p.name && acc.type === p.type && (acc.subtype || 'other') === (p.subtype ?? 'other'))
        );
        if (!plaidAccount) continue;
        const bal = balancesByAccountId.get(plaidAccount.account_id) ?? { current: 0, available: 0 };
        const liability = liabilityByAccountId.get(plaidAccount.account_id);
        await ctx.runMutation(internal.plaid.updateAccountFromPlaid, {
          accountId: acc._id,
          userId,
          currentBalance: Math.round((bal.current ?? 0) * 100),
          availableBalance: Math.round((bal.available ?? bal.current ?? 0) * 100),
          ...(liability?.interestRate !== undefined && { interestRate: liability.interestRate }),
          ...(liability?.minimumPayment !== undefined && { minimumPayment: liability.minimumPayment }),
          ...(liability?.nextPaymentDueDate && { nextPaymentDueDate: liability.nextPaymentDueDate }),
        });
        updated++;
      }
    }
    return { updated, message: updated > 0 ? `Updated ${updated} account(s).` : 'No accounts updated.' };
  },
});

/**
 * Sync transactions from linked Plaid account(s). Call from the Transactions page
 * ("Import from bank"). Optionally pass itemIds to import only from selected banks.
 */
export const syncPlaidTransactions = action({
  args: {
    itemIds: v.optional(v.array(v.id('plaidItems'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const clientId = process.env.PLAID_CLIENT_ID;
    const secret = process.env.PLAID_SECRET;
    if (!clientId || !secret) {
      throw new Error('Plaid is not configured.');
    }
    const baseUrl = getPlaidBaseUrl();
    let items = await ctx.runQuery(internal.plaid.getItemsWithTokensForUser, { userId });
    if (args.itemIds != null && args.itemIds.length > 0) {
      const set = new Set(args.itemIds);
      items = items.filter((i) => set.has(i.itemId));
    }
    if (items.length === 0) {
      return { imported: 0, message: 'No linked bank accounts selected. Link an account on the Accounts tab or pick which to import from.' };
    }
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalRemoved = 0;
    let skippedWrongMode = 0;
    for (const { itemId, accessToken, transactionsSyncCursor } of items) {
      let cursor: string | undefined = transactionsSyncCursor;
      const added: Array<{ transaction_id: string; account_id: string; amount: number; date: string; name: string; merchant_name?: string | null; pending?: boolean }> = [];
      const modified: Array<{ transaction_id: string; account_id: string; amount: number; date: string; name: string; merchant_name?: string | null; pending?: boolean }> = [];
      const removed: string[] = [];
      let hasMore = true;
      let skipThisItem = false;
      while (hasMore) {
        const body: { access_token: string; cursor?: string; count?: number } = {
          access_token: accessToken,
          count: 500,
        };
        if (cursor !== undefined && cursor !== '') body.cursor = cursor;
        const res = await fetch(`${baseUrl}/transactions/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            secret,
            ...body,
          }),
        });
        const data = (await res.json()) as {
          added?: Array<{ transaction_id: string; account_id: string; amount: number; date: string; name: string; merchant_name?: string | null; pending?: boolean }>;
          modified?: Array<{ transaction_id: string; account_id: string; amount: number; date: string; name: string; merchant_name?: string | null; pending?: boolean }>;
          removed?: Array<{ transaction_id: string }>;
          next_cursor: string;
          has_more: boolean;
          error_code?: string;
          error_message?: string;
        };
        if (!res.ok || data.error_code) {
          const msg = data.error_message || `Transactions sync failed: ${res.status}`;
          if (msg.toLowerCase().includes('wrong plaid environment') || msg.toLowerCase().includes('access token is for')) {
            await ctx.runMutation(internal.plaid.markPlaidItemNeedsReauth, { itemId, userId });
            skippedWrongMode += 1;
            skipThisItem = true;
            break;
          }
          throw new Error(msg);
        }
        if (Array.isArray(data.added)) {
          for (const t of data.added) {
            const n = normalizePlaidTransaction(t as Record<string, unknown>);
            if (n) added.push(n);
          }
        }
        if (Array.isArray(data.modified)) {
          for (const t of data.modified) {
            const n = normalizePlaidTransaction(t as Record<string, unknown>);
            if (n) modified.push(n);
          }
        }
        if (Array.isArray(data.removed)) {
          for (const r of data.removed) {
            if (typeof r === 'string') removed.push(r);
            else if (r && typeof r.transaction_id === 'string') removed.push(r.transaction_id);
          }
        }
        hasMore = data.has_more === true;
        cursor = data.next_cursor;
      }
      if (skipThisItem) continue;
      if (cursor) {
        const result = await ctx.runMutation(internal.plaid.applyTransactionsSync, {
          itemId,
          userId,
          nextCursor: cursor,
          added,
          modified,
          removed,
        });
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalRemoved += result.removed;
      }
    }
    const total = totalInserted + totalUpdated + totalRemoved;
    const msgParts: string[] = [];
    if (total > 0) {
      msgParts.push(`Imported ${totalInserted} new, updated ${totalUpdated}, removed ${totalRemoved} transaction(s).`);
    }
    if (skippedWrongMode > 0) {
      msgParts.push(
        `${skippedWrongMode} outdated link(s) were skipped (they were linked in a different Plaid mode). Remove those accounts on the Accounts tab if you no longer need them.`
      );
    }
    if (msgParts.length === 0) msgParts.push('No new transactions.');
    return {
      imported: totalInserted,
      updated: totalUpdated,
      removed: totalRemoved,
      message: msgParts.join(' '),
    };
  },
});
