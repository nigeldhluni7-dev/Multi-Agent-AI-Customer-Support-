import { v } from "convex/values";
import {
  query,
  internalQuery,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
import { getViewer } from "./authz";
import { Id } from "./_generated/dataModel";
import {
  listOrderDocs,
  findOrderDoc,
  setOrderStatus,
  toOrderView,
} from "./customerScope";

const orderStatus = v.union(
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

// Customer-facing path: resolve identity from the session, then read through
// the SAME boundary the assistant uses.
export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (viewer === null) return [];
    return await listOrderDocs(ctx, { customerId: viewer.userId });
  },
});

// ---------------------------------------------------------------------------
// Assistant tools (internal). Each receives the served `customerId` — the
// identity the assistant action resolved the request to — and reaches data
// ONLY through customerScope.ts. There is no separate, more permissive path:
// these call the exact same helpers as the customer-facing query above.
// ---------------------------------------------------------------------------
export const listOrdersForCustomer = internalQuery({
  args: { customerId: v.id("users") },
  handler: async (ctx, { customerId }) => {
    const docs = await listOrderDocs(ctx, { customerId });
    return docs.map(toOrderView);
  },
});

export const getOrderForCustomer = internalQuery({
  args: { customerId: v.id("users"), reference: v.string() },
  handler: async (ctx, { customerId, reference }) => {
    const order = await findOrderDoc(ctx, { customerId }, reference);
    return order === null ? null : toOrderView(order);
  },
});

export const setOrderStatusForCustomer = internalMutation({
  args: {
    customerId: v.id("users"),
    reference: v.string(),
    status: orderStatus,
  },
  handler: async (ctx, { customerId, reference, status }) => {
    return await setOrderStatus(ctx, { customerId }, reference, status);
  },
});

// Seed a couple of sample orders for a brand-new customer, so the assistant has
// real data to look up during a demo.
export async function seedOrdersForCustomer(
  ctx: MutationCtx,
  customerId: Id<"users">,
) {
  await ctx.db.insert("orders", {
    customerId,
    reference: "ORD-1001",
    item: "Wireless Keyboard",
    quantity: 1,
    status: "shipped",
    shippingAddress: "221B Baker Street, London",
    total: 49.99,
  });
  await ctx.db.insert("orders", {
    customerId,
    reference: "ORD-1002",
    item: "USB-C Charger",
    quantity: 2,
    status: "processing",
    shippingAddress: "221B Baker Street, London",
    total: 39.98,
  });
}
