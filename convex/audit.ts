import { v } from "convex/values";
import { query, internalMutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireViewer, authorizeTicket } from "./authz";

export type AuditEntry = {
  ticketId?: Id<"tickets">;
  actorType: "customer" | "agent" | "assistant" | "system";
  actorId?: Id<"users">;
  action: string;
  summary: string;
  data?: unknown;
};

// Append a row to the permanent audit trail. Insert-only: nothing in the app
// ever patches or deletes auditLog rows, which is what makes it permanent.
export async function recordAudit(ctx: MutationCtx, entry: AuditEntry) {
  await ctx.db.insert("auditLog", {
    ticketId: entry.ticketId,
    actorType: entry.actorType,
    actorId: entry.actorId,
    action: entry.action,
    summary: entry.summary,
    data: entry.data,
  });
}

export const append = internalMutation({
  args: {
    ticketId: v.optional(v.id("tickets")),
    actorType: v.union(
      v.literal("customer"),
      v.literal("agent"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    actorId: v.optional(v.id("users")),
    action: v.string(),
    summary: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await recordAudit(ctx, args);
    return null;
  },
});

// The full audit trail for one ticket. Access follows the same boundary as the
// ticket itself: an agent, or the owning customer, may reconstruct the case.
export const ticketAuditLog = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    await authorizeTicket(ctx, args.ticketId, viewer);

    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .take(500);

    return entries.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      actorType: e.actorType,
      action: e.action,
      summary: e.summary,
      data: e.data,
    }));
  },
});
