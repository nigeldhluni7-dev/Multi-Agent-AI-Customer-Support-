import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import {
  getViewer,
  requireViewer,
  requireAgent,
  authorizeTicket,
} from "./authz";
import { recordAudit } from "./audit";
import { onTicketCreated, onTicketStatusChanged } from "./ticketStats";

// ---------------------------------------------------------------------------
// Agent-facing: the live queue (deliverable a). Restricted to agents (b): a
// customer calling this directly is rejected on the server, not just in the UI.
// ---------------------------------------------------------------------------
export const agentQueue = query({
  args: {},
  handler: async (ctx) => {
    await requireAgent(ctx);

    const openTickets = await ctx.db
      .query("tickets")
      .withIndex("by_status_and_lastMessageAt", (q) => q.eq("status", "open"))
      .order("desc")
      .take(100);

    return await Promise.all(
      openTickets.map(async (ticket) => {
        const customer = await ctx.db.get("users", ticket.customerId);
        return {
          _id: ticket._id,
          subject: ticket.subject,
          status: ticket.status,
          lastMessageAt: ticket.lastMessageAt,
          lastMessagePreview: ticket.lastMessagePreview,
          customerEmail: customer?.email ?? "unknown",
        };
      }),
    );
  },
});

// The full conversation for one ticket, gated by ownership/role.
export const ticketThread = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    const ticket = await authorizeTicket(ctx, args.ticketId, viewer);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .take(500);

    return {
      ticket: {
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
      },
      messages: messages.map((m) => ({
        _id: m._id,
        authorRole: m.authorRole,
        body: m.body,
        _creationTime: m._creationTime,
      })),
    };
  },
});

// A customer's OWN tickets, scoped to their identity by index — never all rows.
export const myTickets = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (viewer === null) return [];

    return await ctx.db
      .query("tickets")
      .withIndex("by_customer", (q) => q.eq("customerId", viewer.userId))
      .order("desc")
      .take(100);
  },
});

// ---------------------------------------------------------------------------
// Internal helpers used by the AI assistant action (no end-user auth).
// ---------------------------------------------------------------------------
export const getTicketContext = internalQuery({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) return null;

    const customer = await ctx.db.get("users", ticket.customerId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
      .order("asc")
      .take(100);

    return {
      ticket: {
        _id: ticket._id,
        customerId: ticket.customerId,
        subject: ticket.subject,
        status: ticket.status,
      },
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      messages: messages.map((m) => ({
        authorRole: m.authorRole,
        body: m.body,
      })),
    };
  },
});

export const postAssistantMessage = internalMutation({
  args: { ticketId: v.id("tickets"), body: v.string() },
  handler: async (ctx, { ticketId, body }) => {
    const ticket = await ctx.db.get("tickets", ticketId);
    if (ticket === null) throw new Error("Ticket not found");

    await ctx.db.insert("messages", {
      ticketId,
      authorRole: "assistant",
      body,
    });

    await ctx.db.patch("tickets", ticketId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: body.slice(0, 100),
    });

    await recordAudit(ctx, {
      ticketId,
      actorType: "assistant",
      action: "assistant_reply",
      summary: `Assistant replied: ${body.slice(0, 120)}`,
      data: { body },
    });

    return null;
  },
});

// ---------------------------------------------------------------------------
// Writes.
// ---------------------------------------------------------------------------
// Agents move tickets through the queue. Every status change updates the live
// open-ticket count in the same transaction, so the count is always correct
// even with many agents doing this at once.
export const setTicketStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
  },
  handler: async (ctx, { ticketId, status }) => {
    const agent = await requireAgent(ctx);
    const before = await ctx.db.get("tickets", ticketId);
    if (before === null) throw new Error("Ticket not found");
    if (before.status === status) return null;

    await ctx.db.patch("tickets", ticketId, { status });
    const after = await ctx.db.get("tickets", ticketId);
    if (after) await onTicketStatusChanged(ctx, before, after);

    await recordAudit(ctx, {
      ticketId,
      actorType: "agent",
      actorId: agent.userId,
      action: "ticket_status_changed",
      summary: `Agent set status ${before.status} → ${status}`,
      data: { from: before.status, to: status },
    });
    return null;
  },
});

export const createTicket = mutation({
  args: { subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);

    const now = Date.now();
    const ticketId = await ctx.db.insert("tickets", {
      customerId: viewer.userId, // owner is always the caller — never an arg
      subject: args.subject,
      status: "open",
      lastMessageAt: now,
      lastMessagePreview: args.body.slice(0, 100),
    });

    await ctx.db.insert("messages", {
      ticketId,
      authorId: viewer.userId,
      authorRole: "customer",
      body: args.body,
    });

    await recordAudit(ctx, {
      ticketId,
      actorType: viewer.role,
      actorId: viewer.userId,
      action: "ticket_created",
      summary: `Opened ticket “${args.subject}”`,
      data: { subject: args.subject, body: args.body },
    });

    // Reflect the new open ticket in the live count — same transaction.
    const created = await ctx.db.get("tickets", ticketId);
    if (created) await onTicketCreated(ctx, created);

    // Kick off the AI assistant for the opening message.
    if (viewer.role === "customer") {
      await ctx.scheduler.runAfter(0, internal.assistant.generateReply, {
        ticketId,
      });
    }

    return ticketId;
  },
});

export const postReply = mutation({
  args: { ticketId: v.id("tickets"), body: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireViewer(ctx);
    // Structural access check: throws unless the viewer owns the ticket (or is
    // an agent). A customer can never post into another customer's ticket.
    await authorizeTicket(ctx, args.ticketId, viewer);

    await ctx.db.insert("messages", {
      ticketId: args.ticketId,
      authorId: viewer.userId,
      authorRole: viewer.role,
      body: args.body,
    });

    await ctx.db.patch("tickets", args.ticketId, {
      lastMessageAt: Date.now(),
      lastMessagePreview: args.body.slice(0, 100),
    });

    await recordAudit(ctx, {
      ticketId: args.ticketId,
      actorType: viewer.role,
      actorId: viewer.userId,
      action: "message_posted",
      summary: `${viewer.role} posted a message`,
      data: { body: args.body },
    });

    // Customers talking to support get an AI reply; human agents do not.
    if (viewer.role === "customer") {
      await ctx.scheduler.runAfter(0, internal.assistant.generateReply, {
        ticketId: args.ticketId,
      });
    }

    return null;
  },
});
