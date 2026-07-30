import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getViewer, requireViewer } from "./authz";

// The currently signed-in user (identity + role + Google avatar), or null.
export const viewer = query({
  args: {},
  handler: async (ctx) => getViewer(ctx),
});

// Let a user edit their own display name. Identity is resolved server-side —
// a user can only ever update their own record, never another's.
export const updateMyProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const viewer = await requireViewer(ctx);
    const trimmed = name.trim();
    await ctx.db.patch("users", viewer.userId, {
      name: trimmed.length > 0 ? trimmed : undefined,
    });
    return null;
  },
});
