"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "../components/AuthGate";
import { TopBar, RoleBadge } from "../components/ui";

export default function Home() {
  return (
    <AuthGate>
      <HomeInner />
    </AuthGate>
  );
}

function HomeInner() {
  const viewer = useQuery(api.users.viewer);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const isAgent = viewer?.role === "agent";

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar>
        {viewer && (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {viewer.email}
            </span>
            <RoleBadge role={viewer.role} />
          </div>
        )}
        <button
          className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-border rounded-lg px-3 py-1.5 transition-colors"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </button>
      </TopBar>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16 flex flex-col gap-12">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            AI-assisted support · live
          </span>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mt-4 tracking-tight">
            Welcome{viewer?.name ? `, ${viewer.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg">
            Northwind Support Co. — open a ticket and our AI assistant answers
            instantly, with a human team a click away.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <EntryCard
            href="/tickets"
            accent="indigo"
            eyebrow="Customer"
            title="My Tickets"
            body="Open a ticket, chat with the AI assistant, and track your orders in real time."
          />
          {isAgent ? (
            <EntryCard
              href="/agent"
              accent="emerald"
              eyebrow="Agent"
              title="Support Queue"
              body="Watch open tickets arrive live, reply, and reconstruct any case from the audit trail."
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 flex flex-col justify-center text-sm text-slate-400">
              The agent workspace is available to support agents only.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EntryCard({
  href,
  accent,
  eyebrow,
  title,
  body,
}: {
  href: string;
  accent: "indigo" | "emerald";
  eyebrow: string;
  title: string;
  body: string;
}) {
  const ring =
    accent === "indigo"
      ? "hover:border-indigo-400 hover:shadow-indigo-100 dark:hover:shadow-none"
      : "hover:border-emerald-400 hover:shadow-emerald-100 dark:hover:shadow-none";
  const dot = accent === "indigo" ? "text-indigo-600 dark:text-indigo-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <Link
      href={href}
      className={`group rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-sm transition-all hover:shadow-lg ${ring}`}
    >
      <span className={`text-xs font-semibold uppercase tracking-wide ${dot}`}>
        {eyebrow}
      </span>
      <span className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        {title}
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
      <span className="text-sm text-slate-600 dark:text-slate-400">{body}</span>
    </Link>
  );
}
