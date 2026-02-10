import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query('tasks')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('desc')
      .collect();
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return ctx.db.insert('tasks', {
      title: title.trim(),
      completed: false,
      userId: identity.subject,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id('tasks') },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const task = await ctx.db.get(id);
    if (!task || task.userId !== identity.subject) throw new Error('Task not found');
    await ctx.db.patch(id, { completed: !task.completed });
  },
});
