import {
  query,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getViewer } from "./authz";

// ---------------------------------------------------------------------------
// Live, concurrency-correct open-ticket count (deliverable d).
//
// A single counter document would force every ticket write to contend on that
// one row (OCC conflicts, lost throughput under a busy queue). Instead we shard
// the count across NUM_SHARDS rows. Each +1/-1 lands on a RANDOM shard, so many
// agents changing tickets at once almost never touch the same row — writes stay
// contention-free and correct. Reading the count sums the shards (bounded, and
// reactive, so every client updates live the instant the number changes).
//
// Correctness invariant: a ticket contributes +1 the moment it becomes "open"
// and -1 the moment it leaves "open". The sum of shards therefore always equals
// the number of open tickets, regardless of write interleaving.
// ---------------------------------------------------------------------------
const NUM_SHARDS = 16;
const OPEN = "openTickets";

async function addToCounter(ctx: MutationCtx, name: string, delta: number) {
  const shard = Math.floor(Math.random() * NUM_SHARDS);
  const existing = await ctx.db
    .query("counterShards")
    .withIndex("by_name_and_shard", (q) =>
      q.eq("name", name).eq("shard", shard),
    )
    .unique();
  if (existing) {
    await ctx.db.patch("counterShards", existing._id, {
      value: existing.value + delta,
    });
  } else {
    await ctx.db.insert("counterShards", { name, shard, value: delta });
  }
}

// Call these in the SAME mutation as the ticket write so the count can't drift.
export async function onTicketCreated(ctx: MutationCtx, doc: Doc<"tickets">) {
  if (doc.status === "open") await addToCounter(ctx, OPEN, 1);
}

export async function onTicketStatusChanged(
  ctx: MutationCtx,
  oldDoc: Doc<"tickets">,
  newDoc: Doc<"tickets">,
) {
  const wasOpen = oldDoc.status === "open";
  const isOpen = newDoc.status === "open";
  if (wasOpen && !isOpen) await addToCounter(ctx, OPEN, -1);
  else if (!wasOpen && isOpen) await addToCounter(ctx, OPEN, 1);
}

export async function onTicketDeleted(ctx: MutationCtx, doc: Doc<"tickets">) {
  if (doc.status === "open") await addToCounter(ctx, OPEN, -1);
}

export async function countOpenTickets(
  ctx: QueryCtx | MutationCtx,
): Promise<number> {
  const shards = await ctx.db
    .query("counterShards")
    .withIndex("by_name_and_shard", (q) => q.eq("name", OPEN))
    .take(NUM_SHARDS + 1);
  return shards.reduce((sum, s) => sum + s.value, 0);
}

// The live count of open tickets: sum of the shards.
export const openTicketCount = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (viewer === null) return 0;
    return await countOpenTickets(ctx);
  },
});

// One-time reset so the count matches the current table. Idempotent.
export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const s of await ctx.db
      .query("counterShards")
      .withIndex("by_name_and_shard", (q) => q.eq("name", OPEN))
      .take(1000)) {
      await ctx.db.delete("counterShards", s._id);
    }
    const open = await ctx.db
      .query("tickets")
      .withIndex("by_status_and_lastMessageAt", (q) => q.eq("status", "open"))
      .take(100000);
    await ctx.db.insert("counterShards", {
      name: OPEN,
      shard: 0,
      value: open.length,
    });
    return { openTickets: open.length };
  },
});
