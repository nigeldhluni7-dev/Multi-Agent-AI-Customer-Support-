"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useState } from "react";

export function TicketThread({ ticketId }: { ticketId: Id<"tickets"> }) {
  const data = useQuery(api.tickets.ticketThread, { ticketId });
  const audit = useQuery(api.audit.ticketAuditLog, { ticketId });
  const postReply = useMutation(api.tickets.postReply);
  const [reply, setReply] = useState("");
  const [showAudit, setShowAudit] = useState(true);

  if (data === undefined)
    return <div className="p-4 text-slate-400">Loading…</div>;

  return (
    <>
      <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center gap-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">
          {data.ticket.subject}
        </h2>
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
        >
          {showAudit ? "Hide audit log" : "Show audit log"}
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {data.messages.map((m) => (
              <div
                key={m._id}
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${bubbleClass(m.authorRole)}`}
              >
                <p className="text-[10px] uppercase tracking-wide opacity-60 mb-1">
                  {m.authorRole}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            ))}
          </div>
          <form
            className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2"
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
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
            >
              Send
            </button>
          </form>
        </div>

        {showAudit && (
          <aside className="w-80 border-l border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900/40">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Permanent audit trail
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Append-only record of every ticket and assistant action.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {audit === undefined && (
                <p className="text-xs text-slate-400">Loading audit…</p>
              )}
              {audit?.length === 0 && (
                <p className="text-xs text-slate-400">No events yet.</p>
              )}
              {audit?.map((e) => (
                <div
                  key={e._id}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-2"
                >
                  <div className="flex justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                    <span>{e.actorType}</span>
                    <span>{e.action}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {e.summary}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(e._creationTime).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function bubbleClass(role: string) {
  if (role === "customer") {
    return "bg-blue-600 text-white self-end";
  }
  if (role === "assistant") {
    return "bg-violet-100 dark:bg-violet-950 text-slate-900 dark:text-slate-100 self-start border border-violet-200 dark:border-violet-800";
  }
  if (role === "system") {
    return "bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-100 self-center text-center max-w-full";
  }
  return "bg-slate-100 dark:bg-slate-800 self-start";
}
