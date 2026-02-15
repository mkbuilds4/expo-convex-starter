import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('asc')
      .collect();
  },
});

export const listOnBudget = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const all = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return all;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    subtype: v.string(),
    currentBalance: v.number(),
    availableBalance: v.optional(v.number()),
    isOnBudget: v.boolean(),
    interestRate: v.optional(v.number()),
    minimumPayment: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const sortOrder = existing.length;
    return ctx.db.insert('accounts', {
      userId,
      name: args.name.trim(),
      type: args.type,
      subtype: args.subtype,
      currentBalance: args.currentBalance,
      availableBalance: args.availableBalance ?? args.currentBalance,
      isOnBudget: args.isOnBudget,
      sortOrder,
      interestRate: args.interestRate,
      minimumPayment: args.minimumPayment,
    });
  },
});

export const updateBalance = mutation({
  args: {
    id: v.id('accounts'),
    currentBalance: v.number(),
    availableBalance: v.optional(v.number()),
  },
  handler: async (ctx, { id, currentBalance, availableBalance }) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(id);
    if (!acc || acc.userId !== userId) throw new Error('Account not found');
    await ctx.db.patch(id, {
      currentBalance,
      ...(availableBalance !== undefined && { availableBalance }),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('accounts'),
    name: v.optional(v.string()),
    interestRate: v.optional(v.number()),
    minimumPayment: v.optional(v.number()),
    nextPaymentDueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(args.id);
    if (!acc || acc.userId !== userId) throw new Error('Account not found');
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.interestRate !== undefined) updates.interestRate = args.interestRate;
    if (args.minimumPayment !== undefined) updates.minimumPayment = args.minimumPayment;
    if (args.nextPaymentDueDate !== undefined) updates.nextPaymentDueDate = args.nextPaymentDueDate || undefined;
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id('accounts') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(id);
    if (!acc || acc.userId !== userId) throw new Error('Account not found');
    await ctx.db.delete(id);
  },
});
