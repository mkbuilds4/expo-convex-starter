import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export const listByAccount = query({
  args: { accountId: v.id('accounts'), limit: v.optional(v.number()) },
  handler: async (ctx, { accountId, limit = 100 }) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(accountId);
    if (!acc || acc.userId !== userId) return [];
    const list = await ctx.db
      .query('transactions')
      .withIndex('by_account_date', (q) => q.eq('accountId', accountId))
      .order('desc')
      .take(limit);
    return list;
  },
});

export const listAll = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const accountIds = accounts.map((a) => a._id);
    type TxnWithAccount = Doc<'transactions'> & { account?: Doc<'accounts'> };
    const all: TxnWithAccount[] = [];
    for (const aid of accountIds) {
      const txns = await ctx.db
        .query('transactions')
        .withIndex('by_account_date', (q) => q.eq('accountId', aid))
        .order('desc')
        .take(limit);
      const acc = accounts.find((a) => a._id === aid);
      for (const t of txns) {
        all.push({ ...t, account: acc });
      }
    }
    all.sort((a, b) => {
      const da = (a as Doc<'transactions'>).date;
      const db = (b as Doc<'transactions'>).date;
      return db > da ? 1 : db < da ? -1 : 0;
    });
    return all.slice(0, limit);
  },
});

export const create = mutation({
  args: {
    accountId: v.id('accounts'),
    amount: v.number(),
    date: v.string(),
    merchantName: v.string(),
    categoryId: v.optional(v.id('budgetCategories')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const acc = await ctx.db.get(args.accountId);
    if (!acc || acc.userId !== userId) throw new Error('Account not found');
    const id = await ctx.db.insert('transactions', {
      accountId: args.accountId,
      amount: args.amount,
      date: args.date,
      merchantName: args.merchantName.trim(),
      categoryId: args.categoryId,
      isManual: true,
      isApproved: true,
      isSplit: false,
      notes: args.notes?.trim(),
    });
    await ctx.db.patch(args.accountId, {
      currentBalance: acc.currentBalance + args.amount,
      availableBalance: (acc.availableBalance ?? acc.currentBalance) + args.amount,
    });
    return id;
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id('transactions'),
    categoryId: v.optional(v.id('budgetCategories')),
  },
  handler: async (ctx, { id, categoryId }) => {
    const tx = await ctx.db.get(id);
    if (!tx) throw new Error('Transaction not found');
    const acc = await ctx.db.get(tx.accountId);
    if (!acc) throw new Error('Account not found');
    const userId = await requireUserId(ctx);
    if (acc.userId !== userId) throw new Error('Unauthorized');
    await ctx.db.patch(id, { categoryId: categoryId ?? undefined });
  },
});
