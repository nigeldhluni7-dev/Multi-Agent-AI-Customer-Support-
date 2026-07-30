import { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

export type Role = "customer" | "agent";

export type Viewer = {
  userId: Id<"users">;
  role: Role;
  email: string | null;
  name: string | null;
  image: string | null;
};

// Resolve the current identity from the verified session token. Identity is
// NEVER taken from function arguments — always derived here, server-side.
export async function getViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  const user = await ctx.db.get("users", userId);

  return {
    userId,
    role: profile?.role ?? "customer",
    email: user?.email ?? null,
    name: user?.name ?? null,
    image: user?.image ?? null,
  };
}

export async function requireViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const viewer = await getViewer(ctx);
  if (viewer === null) throw new Error("Not authenticated");
  return viewer;
}

export async function requireAgent(
  ctx: QueryCtx | MutationCtx,
): Promise<Viewer> {
  const viewer = await requireViewer(ctx);
  if (viewer.role !== "agent") {
    throw new Error("Forbidden: this action is restricted to agents");
  }
  return viewer;
}

// Load a ticket ONLY if the viewer may access it:
//   - an agent may access any ticket,
//   - a customer may access only their own.
// The throw lives here, on the server, so a customer cannot reach another
// customer's ticket by any route (direct API call included) — not merely
// hidden by the UI.
export async function authorizeTicket(
  ctx: QueryCtx | MutationCtx,
  ticketId: Id<"tickets">,
  viewer: Viewer,
): Promise<Doc<"tickets">> {
  const ticket = await ctx.db.get("tickets", ticketId);
  if (ticket === null) throw new Error("Ticket not found");
  if (viewer.role !== "agent" && ticket.customerId !== viewer.userId) {
    throw new Error("Forbidden: you do not have access to this ticket");
  }
  return ticket;
}
