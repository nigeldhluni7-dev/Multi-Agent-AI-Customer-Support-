// TEMPORARY proof for deliverable (d): the open-ticket count stays correct
// under concurrent writes. Creates/resolves many tickets in parallel and
// checks the counter count always equals a ground-truth table scan.
// Deleted after verification.
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  countOpenTickets,
  onTicketCreated,
  onTicketStatusChanged,
  onTicketDeleted,
} from "./ticketStats";

export const seedCustomer = internalMutation({
  args: {},
  handler: async (ctx) =>
    ctx.db.insert("users", { email: "stats-test@example.com" }),
});

export const cleanupCustomer = internalMutation({
  args: { customerId: v.id("users") },
  handler: async (ctx, { customerId }) => {
    await ctx.db.delete("users", customerId);
    return null;
  },
});

export const countBoth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const counter = await countOpenTickets(ctx);
    const open = await ctx.db
      .query("tickets")
      .withIndex("by_status_and_lastMessageAt", (q) => q.eq("status", "open"))
      .take(100000);
    return { counter, scanned: open.length };
  },
});

export const makeTicket = internalMutation({
  args: { customerId: v.id("users"), tag: v.string() },
  handler: async (ctx, { customerId, tag }) => {
    const now = Date.now();
    const id = await ctx.db.insert("tickets", {
      customerId,
      subject: tag,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: tag,
    });
    const doc = await ctx.db.get("tickets", id);
    if (doc) await onTicketCreated(ctx, doc);
    return id;
  },
});

export const resolveTicket = internalMutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const before = await ctx.db.get("tickets", ticketId);
    if (before === null) return null;
    await ctx.db.patch("tickets", ticketId, { status: "resolved" });
    const after = await ctx.db.get("tickets", ticketId);
    if (after) await onTicketStatusChanged(ctx, before, after);
    return null;
  },
});

export const removeTicket = internalMutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const doc = await ctx.db.get("tickets", ticketId);
    if (doc) {
      await onTicketDeleted(ctx, doc);
      await ctx.db.delete("tickets", ticketId);
    }
    return null;
  },
});

export const run = action({
  args: {},
  handler: async (ctx) => {
    const customerId: Id<"users"> = await ctx.runMutation(
      internal.statsTest.seedCustomer,
      {},
    );

    const before: { counter: number; scanned: number } =
      await ctx.runQuery(internal.statsTest.countBoth, {});

    // Open 20 tickets concurrently.
    const ids: Id<"tickets">[] = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        ctx.runMutation(internal.statsTest.makeTicket, {
          customerId,
          tag: `CT-${i}`,
        }),
      ),
    );
    const afterCreate: { counter: number; scanned: number } =
      await ctx.runQuery(internal.statsTest.countBoth, {});

    // Resolve 8 of them concurrently.
    await Promise.all(
      ids
        .slice(0, 8)
        .map((id) =>
          ctx.runMutation(internal.statsTest.resolveTicket, { ticketId: id }),
        ),
    );
    const afterResolve: { counter: number; scanned: number } =
      await ctx.runQuery(internal.statsTest.countBoth, {});

    // Clean up.
    await Promise.all(
      ids.map((id) =>
        ctx.runMutation(internal.statsTest.removeTicket, { ticketId: id }),
      ),
    );
    await ctx.runMutation(internal.statsTest.cleanupCustomer, { customerId });
    const afterCleanup: { counter: number; scanned: number } =
      await ctx.runQuery(internal.statsTest.countBoth, {});

    return {
      before,
      afterCreate,
      afterResolve,
      afterCleanup,
      created_20_ok:
        afterCreate.counter === before.counter + 20 &&
        afterCreate.counter === afterCreate.scanned,
      resolved_8_ok:
        afterResolve.counter === before.counter + 12 &&
        afterResolve.counter === afterResolve.scanned,
      counter_always_matches_scan:
        afterCreate.counter === afterCreate.scanned &&
        afterResolve.counter === afterResolve.scanned &&
        afterCleanup.counter === afterCleanup.scanned,
    };
  },
});
