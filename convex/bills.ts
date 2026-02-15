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
      .query('recurringBills')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
  },
});

/** Total of all recurring bills per month (cents). */
export const getTotalMonthlyCents = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const bills = await ctx.db
      .query('recurringBills')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return bills.reduce((sum, b) => sum + b.amount, 0);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    dueDay: v.number(),
  },
  handler: async (ctx, { name, amount, dueDay }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query('recurringBills')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const sortOrder = existing.length;
    const day = Math.max(1, Math.min(31, dueDay));
    return ctx.db.insert('recurringBills', {
      userId,
      name: name.trim(),
      amount,
      dueDay: day,
      sortOrder,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id('recurringBills'),
    name: v.optional(v.string()),
    amount: v.optional(v.number()),
    dueDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const bill = await ctx.db.get(args.id);
    if (!bill || bill.userId !== userId) throw new Error('Bill not found');
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.dueDay !== undefined) updates.dueDay = Math.max(1, Math.min(31, args.dueDay));
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id('recurringBills') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const bill = await ctx.db.get(id);
    if (!bill || bill.userId !== userId) throw new Error('Bill not found');
    await ctx.db.delete(id);
  },
});
