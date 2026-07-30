"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGate } from "../components/AuthGate";

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
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Northwind Support
        </span>
        <div className="flex items-center gap-4">
          {viewer?.email && (
            <span className="text-sm text-slate-500 hidden sm:inline">
              {viewer.email}
              <span className="ml-2 text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700">
                {viewer.role}
              </span>
            </span>
          )}
          <button
            className="bg-slate-600 hover:bg-slate-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            onClick={() =>
              void signOut().then(() => {
                router.push("/signin");
              })
            }
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            Welcome{viewer?.name ? `, ${viewer.name}` : ""}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Self-serve customer support for Northwind Support Co.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href="/tickets"
            className="group flex flex-col gap-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Customer
            </span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
              My Tickets →
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Open a ticket — the AI assistant replies with order tools, and
              every action is written to the audit trail.
            </span>
          </Link>

          {/* Agent workspace is only offered to agents. The server also enforces
              this — the card's absence is convenience, not the security. */}
          {isAgent && (
            <Link
              href="/agent"
              className="group flex flex-col gap-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6 hover:border-emerald-500 hover:shadow-lg transition-all"
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Agent
              </span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Support Queue →
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Watch open tickets arrive live and reply without refreshing.
              </span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
