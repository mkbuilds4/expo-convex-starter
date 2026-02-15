/**
 * Generate upload URL for Convex file storage (e.g. statement/screenshot upload).
 */

import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';

async function requireUserId(ctx: MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Not authenticated');
  return identity.subject;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
