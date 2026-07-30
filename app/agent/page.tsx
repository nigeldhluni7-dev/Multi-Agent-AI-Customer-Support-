"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import { AuthGate } from "../../components/AuthGate";
import { TicketThread } from "../../components/TicketThread";
import { TopBar } from "../../components/ui";

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
        <div className="text-center flex flex-col gap-3 max-w-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-2xl mx-auto">
            🔒
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-medium">
            The agent queue is restricted to support agents.
          </p>
          <Link href="/" className="text-indigo-600 hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Home
        </Link>
      </TopBar>

      <div className="flex-1 flex min-h-0">
        <aside className="w-80 shrink-0 border-r border-border flex flex-col">
          <div className="h-14 px-4 border-b border-border flex items-center justify-between">
            <h1 className="font-semibold text-slate-800 dark:text-slate-100">
              Queue
            </h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {queue === undefined
                ? "…"
                : `${queue.length} open · live`}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {queue?.length === 0 && (
              <p className="px-4 py-4 text-sm text-slate-500">
                No open tickets. New ones appear here the instant a customer
                writes in — no refresh needed.
              </p>
            )}
            {queue?.map((t) => (
              <button
                key={t._id}
                onClick={() => setSelected(t._id)}
                className={`w-full text-left px-4 py-3 border-b border-border/60 transition-colors ${
                  selected === t._id
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-500 text-white grid place-items-center text-[10px] font-bold uppercase">
                    {t.customerEmail.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">
                      {t.subject}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {t.customerEmail}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate mt-1.5">
                  {t.lastMessagePreview}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-w-0">
          {selected === null ? (
            <div className="flex-1 grid place-items-center text-center px-6">
              <div className="max-w-xs flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 grid place-items-center text-2xl">
                  📋
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  Select a ticket
                </p>
                <p className="text-sm text-slate-400">
                  Open a conversation to reply or review its audit trail.
                </p>
              </div>
            </div>
          ) : (
            <TicketThread ticketId={selected} />
          )}
        </section>
      </div>
    </div>
  );
}
