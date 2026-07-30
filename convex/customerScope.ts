import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// THE per-customer data boundary (deliverable d).
//
// A CustomerScope is the single authenticated customer identity that a request
// has resolved to. EVERY read or write of a customer's order data goes through
// the functions below, and each one is bound to `scope.customerId` via the
// `by_customer` index. There is deliberately no unscoped accessor — no
// "get any order by id" — so neither the human customer path nor the AI
// assistant can reach outside the one identity it resolved to. Both paths call
// these exact functions; there is no separate, more permissive path.
// ---------------------------------------------------------------------------

export type CustomerScope = { customerId: Id<"users"> };

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export type OrderView = {
  reference: string;
  item: string;
  quantity: number;
  status: OrderStatus;
  shippingAddress: string;
  total: number;
};

export function toOrderView(order: Doc<"orders">): OrderView {
  return {
    reference: order.reference,
    item: order.item,
    quantity: order.quantity,
    status: order.status,
    shippingAddress: order.shippingAddress,
    total: order.total,
  };
}

// Read all of the scoped customer's order documents.
export async function listOrderDocs(
  ctx: QueryCtx | MutationCtx,
  scope: CustomerScope,
): Promise<Doc<"orders">[]> {
  return await ctx.db
    .query("orders")
    .withIndex("by_customer", (q) => q.eq("customerId", scope.customerId))
    .order("desc")
    .take(100);
}

// Find one order by reference, but ONLY within the scoped customer's rows.
// A reference that belongs to another customer resolves to null here — it is
// unreachable, not merely hidden.
export async function findOrderDoc(
  ctx: QueryCtx | MutationCtx,
  scope: CustomerScope,
  reference: string,
): Promise<Doc<"orders"> | null> {
  return await ctx.db
    .query("orders")
    .withIndex("by_customer", (q) => q.eq("customerId", scope.customerId))
    .filter((q) => q.eq(q.field("reference"), reference))
    .unique();
}

export type SetOrderStatusResult =
  | { ok: true; reference: string; status: OrderStatus }
  | { ok: false; message: string };

// Change an order's status, only within the scoped customer's rows.
export async function setOrderStatus(
  ctx: MutationCtx,
  scope: CustomerScope,
  reference: string,
  status: OrderStatus,
): Promise<SetOrderStatusResult> {
  const order = await findOrderDoc(ctx, scope, reference);
  if (order === null) {
    return { ok: false, message: "No such order for this customer." };
  }
  await ctx.db.patch("orders", order._id, { status });
  return { ok: true, reference, status };
}
