"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import { AuthGate } from "../../components/AuthGate";
import { TicketThread } from "../../components/TicketThread";

export default function CustomerTicketsPage() {
  return (
    <AuthGate>
      <CustomerInner />
    </AuthGate>
  );
}

function CustomerInner() {
  const myTickets = useQuery(api.tickets.myTickets);
  const myOrders = useQuery(api.orders.myOrders);
  const [selected, setSelected] = useState<Id<"tickets"> | null>(null);

  return (
    <main className="flex h-screen">
      <section className="w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h1 className="font-semibold text-slate-800 dark:text-slate-200">
            My Support Tickets
          </h1>
          <Link href="/" className="text-xs text-blue-600 hover:underline">
            Home
          </Link>
        </header>
        <NewTicketForm onCreated={setSelected} />
        <div className="flex-1 overflow-y-auto">
          {myTickets?.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              No tickets yet. Create one above — the AI assistant will reply
              automatically.
            </p>
          )}
          {myTickets?.map((t) => (
            <button
              key={t._id}
              onClick={() => setSelected(t._id)}
              className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                selected === t._id ? "bg-slate-100 dark:bg-slate-800" : ""
              }`}
            >
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                {t.subject}
              </span>
              <span className="text-xs text-slate-400 truncate block mt-1">
                {t.lastMessagePreview}
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 max-h-40 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">
            My orders
          </p>
          {myOrders?.length === 0 && (
            <p className="text-xs text-slate-500">No orders yet.</p>
          )}
          {myOrders?.map((o) => (
            <div key={o._id} className="text-xs text-slate-600 dark:text-slate-400 mb-1">
              <span className="font-mono">{o.reference}</span> · {o.item} ·{" "}
              <span className="uppercase">{o.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex-1 flex flex-col min-w-0">
        {selected === null ? (
          <div className="flex-1 grid place-items-center text-slate-400 text-sm">
            Select or create a ticket
          </div>
        ) : (
          <TicketThread ticketId={selected} />
        )}
      </section>
    </main>
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
      className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-2"
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
        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your issue…"
        rows={2}
        className="rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm resize-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
      >
        Open ticket
      </button>
    </form>
  );
}
