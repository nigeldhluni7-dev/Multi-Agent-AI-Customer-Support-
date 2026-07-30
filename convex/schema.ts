import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  // Role for each authenticated user. Kept in a separate table (not chosen by
  // the client) so identity/role is always derived server-side.
  profiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("customer"), v.literal("agent")),
  }).index("by_userId", ["userId"]),

  // A support ticket owned by exactly one customer.
  tickets: defineTable({
    customerId: v.id("users"),
    subject: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    assignedAgentId: v.optional(v.id("users")),
    // Denormalized so the queue can sort/preview without reading every message.
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
  })
    // The agent queue: filter by status, newest activity first.
    .index("by_status_and_lastMessageAt", ["status", "lastMessageAt"])
    // A customer's own tickets (used for isolation in the next deliverable).
    .index("by_customer", ["customerId"]),

  // Every message on a ticket — customer, agent, AI assistant, or system.
  messages: defineTable({
    ticketId: v.id("tickets"),
    authorId: v.optional(v.id("users")),
    authorRole: v.union(
      v.literal("customer"),
      v.literal("agent"),
      v.literal("assistant"),
      v.literal("system"),
    ),
    body: v.string(),
  }).index("by_ticket", ["ticketId"]),

  // A customer's orders. The assistant may look these up / modify them, but
  // only for the customer it is currently serving (scoped by customerId).
  orders: defineTable({
    customerId: v.id("users"),
    reference: v.string(),
    item: v.string(),
    quantity: v.number(),
    status: v.union(
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    shippingAddress: v.string(),
    total: v.number(),
  }).index("by_customer", ["customerId"]),

  // Permanent, append-only audit trail. Rows are only ever inserted — never
  // updated or deleted — so a case can be reconstructed long after it closes.
  auditLog: defineTable({
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
  }).index("by_ticket", ["ticketId"]),
});
