"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";
import { Avatar, StatusPill } from "./ui";

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketThread({ ticketId }: { ticketId: Id<"tickets"> }) {
  const data = useQuery(api.tickets.ticketThread, { ticketId });
  const audit = useQuery(api.audit.ticketAuditLog, { ticketId });
  const postReply = useMutation(api.tickets.postReply);
  const [reply, setReply] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  if (data === undefined)
    return (
      <div className="flex-1 grid place-items-center text-slate-400 text-sm">
        Loading conversation…
      </div>
    );

  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 px-5 border-b border-border flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
              {data.ticket.subject}
            </h2>
            <StatusPill status={data.ticket.status} />
          </div>
          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className={`text-xs font-medium rounded-lg px-2.5 py-1.5 border transition-colors ${
              showAudit
                ? "border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/40 dark:text-indigo-300"
                : "border-border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Audit trail
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
          {data.messages.map((m) => {
            const mine = m.authorRole === "customer";
            return (
              <div
                key={m._id}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar role={m.authorRole} />
                <div className={`max-w-[70%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${bubbleClass(m.authorRole)}`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.body}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {m.authorRole === "assistant" ? "AI assistant" : m.authorRole}
                    {" · "}
                    {timeLabel(m._creationTime)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <form
          className="p-4 border-t border-border flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body = reply.trim();
            if (!body) return;
            setReply("");
            void postReply({ ticketId, body });
          }}
        >
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={reply.trim().length === 0}
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      {showAudit && (
        <aside className="w-80 shrink-0 border-l border-border flex flex-col bg-background/60">
          <div className="h-14 px-4 border-b border-border flex flex-col justify-center">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Permanent audit trail
            </h3>
            <p className="text-[11px] text-slate-400">
              Append-only · every ticket &amp; assistant action
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {audit === undefined && (
              <p className="text-xs text-slate-400">Loading…</p>
            )}
            {audit?.length === 0 && (
              <p className="text-xs text-slate-400">No events yet.</p>
            )}
            {audit?.map((e) => (
              <div
                key={e._id}
                className="rounded-lg border border-border bg-card p-2.5"
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {timeLabel(e._creationTime)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5">
                    {e.actorType}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1">
                  {e.action}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{e.summary}</p>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function bubbleClass(role: string) {
  if (role === "customer") {
    return "bg-indigo-600 text-white rounded-br-md";
  }
  if (role === "assistant") {
    return "bg-violet-50 dark:bg-violet-500/10 text-slate-800 dark:text-slate-100 border border-violet-200 dark:border-violet-500/30 rounded-bl-md";
  }
  if (role === "system") {
    return "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-500/30";
  }
  return "bg-card text-slate-800 dark:text-slate-100 border border-border rounded-bl-md";
}
