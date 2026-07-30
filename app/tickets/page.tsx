"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { AuthGate } from "../../components/AuthGate";
import { TicketThread } from "../../components/TicketThread";
import { TopBar, StatusPill } from "../../components/ui";

export default function CustomerTicketsPage() {
  return (
    <AuthGate>
      <CustomerInner />
    </AuthGate>
  );
}

function CustomerInner() {
  const viewer = useQuery(api.users.viewer);
  const myTickets = useQuery(api.tickets.myTickets);
  const myOrders = useQuery(api.orders.myOrders);
  const [selected, setSelected] = useState<Id<"tickets"> | null>(null);

  return (
    <div className="h-screen flex flex-col">
      <TopBar viewer={viewer ?? undefined} />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar: full width on mobile; hidden once a ticket is opened. */}
        <aside
          className={`w-full md:w-80 shrink-0 border-r border-border flex-col ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          <NewTicketForm onCreated={setSelected} />

          <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            My tickets
          </div>
          <div className="flex-1 overflow-y-auto">
            {myTickets?.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-500">
                No tickets yet — open one above and the AI assistant replies
                automatically.
              </p>
            )}
            {myTickets?.map((t) => (
              <button
                key={t._id}
                onClick={() => setSelected(t._id)}
                className={`w-full text-left px-4 py-3 border-b border-border/60 transition-colors ${
                  selected === t._id
                    ? "bg-indigo-50 dark:bg-indigo-500/10"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {t.subject}
                  </span>
                  <StatusPill status={t.status} />
                </div>
                <span className="text-xs text-slate-400 truncate block mt-1">
                  {t.lastMessagePreview}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-border p-3 max-h-44 overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              My orders
            </p>
            {myOrders?.length === 0 && (
              <p className="text-xs text-slate-500">No orders yet.</p>
            )}
            {myOrders?.map((o) => (
              <div
                key={o._id}
                className="flex items-center justify-between text-xs py-1 gap-2"
              >
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  <span className="font-mono text-slate-400">{o.reference}</span>{" "}
                  · {o.item}
                </span>
                <StatusPill status={o.status} />
              </div>
            ))}
          </div>
        </aside>

        {/* Detail: hidden on mobile until a ticket is selected. */}
        <section
          className={`flex-1 flex-col min-w-0 ${selected ? "flex" : "hidden md:flex"}`}
        >
          {selected === null ? (
            <EmptyState />
          ) : (
            <TicketThread
              ticketId={selected}
              onBack={() => setSelected(null)}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 grid place-items-center text-center px-6">
      <div className="max-w-xs flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 grid place-items-center text-2xl">
          💬
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          Select or open a ticket
        </p>
        <p className="text-sm text-slate-400">
          The AI assistant replies the moment you open one.
        </p>
      </div>
    </div>
  );
}

function NewTicketForm({
  onCreated,
}: {
  onCreated: (id: Id<"tickets">) => void;
}) {
  const createTicket = useMutation(api.tickets.createTicket);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      className="p-4 border-b border-border flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const s = subject.trim();
        const b = body.trim();
        if (!s || !b) return;
        setSubject("");
        setBody("");
        void createTicket({ subject: s, body: b }).then(onCreated);
      }}
    >
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your issue…"
        rows={2}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
      />
      <button
        type="submit"
        disabled={!subject.trim() || !body.trim()}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors"
      >
        Open ticket
      </button>
    </form>
  );
}
