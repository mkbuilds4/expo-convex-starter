import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

/** Convert amount (cents) + frequency to monthly cents */
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
    default:
      return amount;
  }
}

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'annual'] as const;

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
