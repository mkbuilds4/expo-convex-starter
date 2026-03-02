import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

/** Get the last day of a month (28–31) */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Project a bill due day onto an actual date for a given month. e.g. dueDay 31 in Feb → 28 or 29 */
function billDateForMonth(year: number, month: number, dueDay: number): string {
  const lastDay = getLastDayOfMonth(year, month);
  const day = Math.min(dueDay, lastDay);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** Extract day (1-31) from YYYY-MM-DD. Defaults to 1 if invalid. */
function dayFromDate(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const d = parts[2];
  return d >= 1 && d <= 31 ? d : 1;
}

export type PaymentItem = {
  type: 'bill' | 'credit';
  id: string;
  name: string;
  amount: number;
  dueDay?: number;
  dueDate?: string;
  /** True if user marked this payment as paid for this month */
  paid: boolean;
  /** YYYY-MM-DD when marked paid, if applicable */
  paidAt?: string;
};

export type PaymentsByDate = Record<string, PaymentItem[]>;

/**
 * Get all upcoming payments (bills + credit card minimum payments) grouped by date.
 * Bills use dueDay (1-31) projected to actual dates for each month.
 * Credit cards use nextPaymentDueDate (YYYY-MM-DD).
 * @param startMonth YYYY-MM — first month to include
 * @param endMonth YYYY-MM — last month to include (defaults to 3 months ahead)
 */
export const getPaymentsByDate = query({
  args: {
    startMonth: v.string(),
    endMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const [startY, startM] = args.startMonth.split('-').map(Number);
    let endY: number;
    let endM: number;
    if (args.endMonth) {
      [endY, endM] = args.endMonth.split('-').map(Number);
    } else {
      const end = new Date(startY, startM - 1 + 3, 1);
      endY = end.getFullYear();
      endM = end.getMonth() + 1;
    }

    const result: PaymentsByDate = {};

    // Fetch payment records for this user (to check paid status)
    const allRecords = await ctx.db
      .query('paymentRecords')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const recordsByKey = new Map<string, { paidAt?: string }>();
    for (const r of allRecords) {
      const monthNum = parseInt(r.month.replace('-', ''), 10);
      const startNum = startY * 100 + startM;
      const endNum = endY * 100 + endM;
      if (monthNum >= startNum && monthNum <= endNum) {
        recordsByKey.set(`${r.type}:${r.refId}:${r.month}`, { paidAt: r.paidAt });
      }
    }

    // Bills — project dueDay to each month in range
    const bills = await ctx.db
      .query('recurringBills')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    for (let y = startY, m = startM; ; ) {
      if (y > endY || (y === endY && m > endM)) break;
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      for (const bill of bills) {
        const dateStr = billDateForMonth(y, m, bill.dueDay);
        if (!result[dateStr]) result[dateStr] = [];
        const record = recordsByKey.get(`bill:${bill._id}:${monthStr}`);
        result[dateStr].push({
          type: 'bill',
          id: bill._id,
          name: bill.name,
          amount: bill.amount,
          dueDay: bill.dueDay,
          dueDate: dateStr,
          paid: !!record,
          paidAt: record?.paidAt,
        });
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    // Credit card payments — project nextPaymentDueDate's day to every month (like bills)
    // Only show when card has a balance (currentBalance > 0)
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const creditAccounts = accounts.filter(
      (acc) =>
        (acc.type === 'credit' || acc.type === 'loan') &&
        acc.nextPaymentDueDate &&
        acc.minimumPayment !== undefined &&
        acc.minimumPayment > 0 &&
        acc.currentBalance > 0
    );

    for (let y = startY, m = startM; ; ) {
      if (y > endY || (y === endY && m > endM)) break;
      const monthStr = `${y}-${String(m).padStart(2, '0')}`;
      for (const acc of creditAccounts) {
        const dueDay = dayFromDate(acc.nextPaymentDueDate!);
        const dateStr = billDateForMonth(y, m, dueDay);
        if (!result[dateStr]) result[dateStr] = [];
        const record = recordsByKey.get(`credit:${acc._id}:${monthStr}`);
        result[dateStr].push({
          type: 'credit',
          id: acc._id,
          name: acc.name,
          amount: acc.minimumPayment!,
          dueDay: dueDay,
          dueDate: dateStr,
          paid: !!record,
          paidAt: record?.paidAt,
        });
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    // Sort items within each date
    for (const date of Object.keys(result)) {
      result[date].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  },
});

/**
 * Mark a bill or credit payment as paid for a given month.
 */
export const markPaid = mutation({
  args: {
    type: v.union(v.literal('bill'), v.literal('credit')),
    refId: v.string(),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Verify ref exists and belongs to user
    if (args.type === 'bill') {
      const bill = await ctx.db.get(args.refId as import('./_generated/dataModel').Id<'recurringBills'>);
      if (!bill || bill.userId !== userId) throw new Error('Bill not found');
    } else {
      const acc = await ctx.db.get(args.refId as import('./_generated/dataModel').Id<'accounts'>);
      if (!acc || acc.userId !== userId) throw new Error('Account not found');
    }

    const existing = await ctx.db
      .query('paymentRecords')
      .withIndex('by_user_ref_month', (q) =>
        q.eq('userId', userId).eq('refId', args.refId).eq('type', args.type).eq('month', args.month)
      )
      .first();

    const now = new Date().toISOString().slice(0, 10);
    if (existing) {
      await ctx.db.patch(existing._id, { paidAt: now });
    } else {
      await ctx.db.insert('paymentRecords', {
        userId,
        type: args.type,
        refId: args.refId,
        month: args.month,
        paidAt: now,
      });
    }
  },
});

/**
 * Mark a bill or credit payment as unpaid for a given month.
 */
export const markUnpaid = mutation({
  args: {
    type: v.union(v.literal('bill'), v.literal('credit')),
    refId: v.string(),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const existing = await ctx.db
      .query('paymentRecords')
      .withIndex('by_user_ref_month', (q) =>
        q.eq('userId', userId).eq('refId', args.refId).eq('type', args.type).eq('month', args.month)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
