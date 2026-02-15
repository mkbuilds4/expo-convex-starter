import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

/** Convert amount (cents) + frequency to monthly cents. One-time sources contribute 0 to monthly total. */
function toMonthlyCents(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return Math.round((amount * 52) / 12);
    case 'biweekly':
      return Math.round((amount * 26) / 12);
    case 'monthly':
      return amount;
    case 'annual':
      return Math.round(amount / 12);
    case 'one-time':
      return 0;
    default:
      return amount;
  }
}

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'annual', 'one-time'] as const;

// ——— Income sources ———

export const listSources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const getTotalMonthlyFromSources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sources = await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return sources.reduce((sum, s) => sum + toMonthlyCents(s.amount, s.frequency), 0);
  },
});

export const createSource = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    frequency: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { name, amount, frequency, type }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const sortOrder = existing.length;
    const freq = FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number]) ? frequency : 'monthly';
    return ctx.db.insert('incomeSources', {
      userId,
      name: name.trim(),
      amount,
      frequency: freq,
      type: type ?? undefined,
      sortOrder,
    });
  },
});

export const updateSource = mutation({
  args: {
    id: v.id('incomeSources'),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    frequency: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const source = await ctx.db.get(args.id);
    if (!source || source.userId !== userId) throw new Error('Source not found');
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.frequency !== undefined) updates.frequency = FREQUENCIES.includes(args.frequency as (typeof FREQUENCIES)[number]) ? args.frequency : source.frequency;
    if (args.type !== undefined) updates.type = args.type || undefined;
    await ctx.db.patch(args.id, updates);
  },
});

export const removeSource = mutation({
  args: { id: v.id('incomeSources') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const source = await ctx.db.get(id);
    if (!source || source.userId !== userId) throw new Error('Source not found');
    await ctx.db.delete(id);
  },
});

// ——— Income entries (actual amounts received) ———

export const listEntriesByMonth = query({
  args: { month: v.string() }, // YYYY-MM
  handler: async (ctx, { month }) => {
    const userId = await requireUserId(ctx);
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
    const entries = await ctx.db
      .query('incomeEntries')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', userId).gte('date', monthStart).lte('date', monthEnd)
      )
      .order('desc')
      .collect();
    const result = [];
    for (const e of entries) {
      let sourceName = e.sourceName ?? 'Other';
      if (e.sourceId) {
        const src = await ctx.db.get(e.sourceId);
        if (src) sourceName = src.name;
      }
      result.push({
        _id: e._id,
        sourceId: e.sourceId,
        sourceName,
        amount: e.amount,
        date: e.date,
        note: e.note,
      });
    }
    return result;
  },
});

export const getTotalReceivedInMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await requireUserId(ctx);
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
    const entries = await ctx.db
      .query('incomeEntries')
      .withIndex('by_user_date', (q) =>
        q.eq('userId', userId).gte('date', monthStart).lte('date', monthEnd)
      )
      .collect();
    return entries.reduce((sum, e) => sum + e.amount, 0);
  },
});

export const addEntry = mutation({
  args: {
    sourceId: v.optional(v.id('incomeSources')),
    sourceName: v.optional(v.string()),
    amount: v.number(),
    date: v.string(), // YYYY-MM-DD
    note: v.optional(v.string()),
  },
  handler: async (ctx, { sourceId, sourceName, amount, date, note }) => {
    const userId = await requireUserId(ctx);
    if (amount <= 0) throw new Error('Amount must be positive');
    return ctx.db.insert('incomeEntries', {
      userId,
      sourceId: sourceId ?? undefined,
      sourceName: sourceName?.trim() || undefined,
      amount,
      date,
      note: note?.trim() || undefined,
    });
  },
});

export const removeEntry = mutation({
  args: { id: v.id('incomeEntries') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error('Entry not found');
    await ctx.db.delete(id);
  },
});

// ——— Income forecasts (potential jobs) ———

export const listForecasts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('incomeForecasts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

/** Monthly equivalent from recurring forecasts only */
export const getForecastRecurringMonthly = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const list = await ctx.db
      .query('incomeForecasts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return list
      .filter((f) => f.kind === 'recurring' && f.frequency)
      .reduce((sum, f) => sum + toMonthlyCents(f.amount, f.frequency!), 0);
  },
});

export const getIncomeSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sources = await ctx.db
      .query('incomeSources')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const forecasts = await ctx.db
      .query('incomeForecasts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const totalFromSources = sources.reduce((sum, s) => sum + toMonthlyCents(s.amount, s.frequency), 0);
    const recurringForecasts = forecasts.filter((f) => f.kind === 'recurring' && f.frequency);
    const oneTimeForecasts = forecasts.filter((f) => f.kind === 'one-time');
    const totalFromRecurringForecasts = recurringForecasts.reduce(
      (sum, f) => sum + toMonthlyCents(f.amount, f.frequency!),
      0
    );
    return {
      totalMonthlyFromSources: totalFromSources,
      totalMonthlyFromRecurringForecasts: totalFromRecurringForecasts,
      projectedMonthlyWithRecurringForecasts: totalFromSources + totalFromRecurringForecasts,
      oneTimeForecasts: oneTimeForecasts.map((f) => ({ _id: f._id, name: f.name, amount: f.amount })),
    };
  },
});

export const addForecast = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    kind: v.string(), // 'one-time' | 'recurring'
    frequency: v.optional(v.string()),
  },
  handler: async (ctx, { name, amount, kind, frequency }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('incomeForecasts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const sortOrder = existing.length;
    const k = kind === 'one-time' ? 'one-time' : 'recurring';
    const freq = k === 'recurring' && frequency && FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number])
      ? frequency
      : undefined;
    return ctx.db.insert('incomeForecasts', {
      userId,
      name: name.trim(),
      amount,
      kind: k,
      frequency: freq,
      sortOrder,
    });
  },
});

export const removeForecast = mutation({
  args: { id: v.id('incomeForecasts') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const f = await ctx.db.get(id);
    if (!f || f.userId !== userId) throw new Error('Forecast not found');
    await ctx.db.delete(id);
  },
});
