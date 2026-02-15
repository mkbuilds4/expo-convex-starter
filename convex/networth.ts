import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

const ASSET_TYPES = ['depository', 'investment'];
const LIABILITY_TYPES = ['credit', 'loan'];

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    let totalAssets = 0;
    let totalLiabilities = 0;
    const assetAccounts: typeof accounts = [];
    const debtAccounts: typeof accounts = [];

    for (const acc of accounts) {
      const balance = acc.currentBalance;
      if (ASSET_TYPES.includes(acc.type)) {
        totalAssets += balance;
        assetAccounts.push(acc);
      } else if (LIABILITY_TYPES.includes(acc.type)) {
        totalLiabilities += balance;
        debtAccounts.push(acc);
      }
    }

    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      assetAccounts,
      debtAccounts,
    };
  },
});

export const getSnapshotHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('netWorthSnapshots')
      .withIndex('by_user_date', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit);
  },
});

export const saveSnapshot = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const accounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    let totalAssets = 0;
    let totalLiabilities = 0;
    for (const acc of accounts) {
      if (ASSET_TYPES.includes(acc.type)) totalAssets += acc.currentBalance;
      else if (LIABILITY_TYPES.includes(acc.type)) totalLiabilities += acc.currentBalance;
    }
    const netWorth = totalAssets - totalLiabilities;

    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query('netWorthSnapshots')
      .withIndex('by_user_date', (q) => q.eq('userId', userId).eq('date', today))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { totalAssets, totalLiabilities, netWorth });
      return existing._id;
    }
    return ctx.db.insert('netWorthSnapshots', {
      userId,
      date: today,
      totalAssets,
      totalLiabilities,
      netWorth,
    });
  },
});
