import { query, mutation } from './_generated/server';
import type { QueryCtx, MutationCtx } from './_generated/server';
import { v } from 'convex/values';

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return ctx.db
      .query('budgetCategories')
      .withIndex('by_user_order', (q) => q.eq('userId', userId))
      .order('asc')
      .collect();
  },
});

export const getAssignmentsForMonth = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    await requireUserId(ctx);
    return ctx.db
      .query('budgetAssignments')
      .withIndex('by_month', (q) => q.eq('month', month))
      .collect();
  },
});

export const getDashboard = query({
  args: { month: v.string() },
  handler: async (ctx, { month }) => {
    const userId = await requireUserId(ctx);
    const allAccounts = await ctx.db
      .query('accounts')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const totalOnBudget = allAccounts
      .filter((a) => a.type === 'depository')
      .reduce((sum, a) => sum + (a.availableBalance ?? a.currentBalance), 0);
    const assignments = await ctx.db
      .query('budgetAssignments')
      .withIndex('by_month', (q) => q.eq('month', month))
      .collect();
    const categories = await ctx.db
      .query('budgetCategories')
      .withIndex('by_user_order', (q) => q.eq('userId', userId))
      .order('asc')
      .collect();
    const categoryIds = new Set(categories.map((c) => c._id));
    const assignedByCategory = new Map<string, number>();
    for (const a of assignments) {
      if (categoryIds.has(a.categoryId)) {
        assignedByCategory.set(a.categoryId, (assignedByCategory.get(a.categoryId) ?? 0) + a.assignedAmount);
      }
    }
    const totalAssigned = [...assignedByCategory.values()].reduce((s, n) => s + n, 0);
    const readyToAssign = totalOnBudget - totalAssigned;
    // Spending per category this month (outflows = negative amounts)
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;
    const txnsInMonth = await ctx.db
      .query('transactions')
      .withIndex('by_date', (q) => q.gte('date', monthStart).lte('date', monthEnd))
      .collect();
    const spentByCategory = new Map<string, number>();
    for (const t of txnsInMonth) {
      if (t.amount >= 0 || !t.categoryId) continue;
      spentByCategory.set(t.categoryId, (spentByCategory.get(t.categoryId) ?? 0) + Math.abs(t.amount));
    }

    return {
      readyToAssign,
      totalOnBudget,
      totalAssigned,
      categories: categories.map((c) => ({
        ...c,
        assigned: assignedByCategory.get(c._id) ?? 0,
        spent: spentByCategory.get(c._id) ?? 0,
      })),
      onBudgetAccounts: allAccounts,
    };
  },
});

export const createCategory = mutation({
  args: {
    groupName: v.string(),
    name: v.string(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return ctx.db.insert('budgetCategories', {
      userId,
      groupName: args.groupName.trim(),
      name: args.name.trim(),
      sortOrder: args.sortOrder,
      isHidden: false,
    });
  },
});

export const setAssignment = mutation({
  args: {
    categoryId: v.id('budgetCategories'),
    month: v.string(),
    assignedAmount: v.number(),
  },
  handler: async (ctx, { categoryId, month, assignedAmount }) => {
    const userId = await requireUserId(ctx);
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.userId !== userId) throw new Error('Category not found');
    const existing = await ctx.db
      .query('budgetAssignments')
      .withIndex('by_category_month', (q) =>
        q.eq('categoryId', categoryId).eq('month', month)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { assignedAmount });
      return existing._id;
    }
    return ctx.db.insert('budgetAssignments', {
      categoryId,
      month,
      assignedAmount,
    });
  },
});

export const addToAssignment = mutation({
  args: {
    categoryId: v.id('budgetCategories'),
    month: v.string(),
    amountToAdd: v.number(),
  },
  handler: async (ctx, { categoryId, month, amountToAdd }) => {
    const userId = await requireUserId(ctx);
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.userId !== userId) throw new Error('Category not found');
    const existing = await ctx.db
      .query('budgetAssignments')
      .withIndex('by_category_month', (q) =>
        q.eq('categoryId', categoryId).eq('month', month)
      )
      .first();
    const newAmount = (existing?.assignedAmount ?? 0) + amountToAdd;
    if (existing) {
      await ctx.db.patch(existing._id, { assignedAmount: Math.max(0, newAmount) });
      return existing._id;
    }
    return ctx.db.insert('budgetAssignments', {
      categoryId,
      month,
      assignedAmount: Math.max(0, newAmount),
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id('budgetCategories'),
    groupName: v.optional(v.string()),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const cat = await ctx.db.get(args.id);
    if (!cat || cat.userId !== userId) throw new Error('Category not found');
    const updates: Record<string, unknown> = {};
    if (args.groupName !== undefined) updates.groupName = args.groupName.trim();
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;
    if (args.isHidden !== undefined) updates.isHidden = args.isHidden;
    await ctx.db.patch(args.id, updates);
  },
});

export const removeCategory = mutation({
  args: { id: v.id('budgetCategories') },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const cat = await ctx.db.get(id);
    if (!cat || cat.userId !== userId) throw new Error('Category not found');
    const assignments = await ctx.db
      .query('budgetAssignments')
      .withIndex('by_category', (q) => q.eq('categoryId', id))
      .collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_category', (q) => q.eq('categoryId', id))
      .collect();
    for (const t of transactions) await ctx.db.patch(t._id, { categoryId: undefined });
    const goals = await ctx.db
      .query('goals')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    for (const g of goals) {
      if (g.categoryId === id) await ctx.db.patch(g._id, { categoryId: undefined });
    }
    await ctx.db.delete(id);
  },
});

/** Remove all categories in a group (room). */
export const removeGroup = mutation({
  args: { groupName: v.string() },
  handler: async (ctx, { groupName }) => {
    const userId = await requireUserId(ctx);
    const categories = await ctx.db
      .query('budgetCategories')
      .withIndex('by_user_order', (q) => q.eq('userId', userId))
      .collect();
    const toDelete = categories.filter((c) => c.groupName === groupName.trim());
    for (const cat of toDelete) {
      const assignments = await ctx.db
        .query('budgetAssignments')
        .withIndex('by_category', (q) => q.eq('categoryId', cat._id))
        .collect();
      for (const a of assignments) await ctx.db.delete(a._id);
      const transactions = await ctx.db
        .query('transactions')
        .withIndex('by_category', (q) => q.eq('categoryId', cat._id))
        .collect();
      for (const t of transactions) await ctx.db.patch(t._id, { categoryId: undefined });
      const goals = await ctx.db
        .query('goals')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
      for (const g of goals) {
        if (g.categoryId === cat._id) await ctx.db.patch(g._id, { categoryId: undefined });
      }
      await ctx.db.delete(cat._id);
    }
  },
});
