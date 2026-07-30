"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import { AuthGate } from "../../components/AuthGate";
import { TicketThread } from "../../components/TicketThread";

export default function AgentQueuePage() {
  return (
    <AuthGate>
      <AgentInner />
    </AuthGate>
  );
}

function AgentInner() {
  const viewer = useQuery(api.users.viewer);
  const isAgent = viewer?.role === "agent";

  // Only agents subscribe to the queue. "skip" means the query never runs for
  // customers — and even if it did, the server rejects it (requireAgent).
  const queue = useQuery(api.tickets.agentQueue, isAgent ? {} : "skip");
  const [selected, setSelected] = useState<Id<"tickets"> | null>(null);

  if (viewer === undefined) {
    return (
      <div className="grid place-items-center h-screen text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!isAgent) {
    return (
      <div className="grid place-items-center h-screen">
        <div className="text-center flex flex-col gap-3">
          <p className="text-slate-700 dark:text-slate-300 font-medium">
            The agent queue is restricted to support agents.
          </p>
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen">
      <section className="w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="font-semibold text-slate-800 dark:text-slate-200">
              Agent Queue
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {queue === undefined
                ? "Loading…"
                : `${queue.length} open ticket${queue.length === 1 ? "" : "s"} · live`}
            </p>
          </div>
          <Link href="/" className="text-xs text-blue-600 hover:underline">
            Home
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto">
          {queue?.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              No open tickets. Create one from the customer page and watch it
              appear here instantly.
            </p>
          )}
          {queue?.map((t) => (
            <button
              key={t._id}
              onClick={() => setSelected(t._id)}
              className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                selected === t._id ? "bg-slate-100 dark:bg-slate-800" : ""
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {t.subject}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shrink-0">
                  {t.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-1">
                {t.customerEmail}
              </p>
              <p className="text-xs text-slate-400 truncate mt-1">
                {t.lastMessagePreview}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex-1 flex flex-col min-w-0">
        {selected === null ? (
          <div className="flex-1 grid place-items-center text-slate-400 text-sm">
            Select a ticket to view the conversation
          </div>
        ) : (
          <TicketThread ticketId={selected} />
        )}
      </section>
    </main>
  );
}
