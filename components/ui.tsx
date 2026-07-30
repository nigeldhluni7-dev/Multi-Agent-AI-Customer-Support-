"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white font-bold text-sm shadow-sm">
        N
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
        Northwind Support
      </span>
    </Link>
  );
}

const ROLE_STYLES: Record<string, { bg: string; label: string; letter: string }> =
  {
    customer: {
      bg: "bg-indigo-500",
      label: "Customer",
      letter: "C",
    },
    agent: { bg: "bg-emerald-500", label: "Agent", letter: "A" },
    assistant: { bg: "bg-violet-500", label: "AI assistant", letter: "AI" },
    system: { bg: "bg-amber-500", label: "System", letter: "S" },
  };

export function Avatar({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.customer;
  return (
    <span
      className={`shrink-0 w-7 h-7 rounded-full ${s.bg} text-white grid place-items-center text-[10px] font-bold shadow-sm`}
      title={s.label}
    >
      {s.letter}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.customer;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
      <span className={`w-1.5 h-1.5 rounded-full ${s.bg}`} />
      {s.label}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    resolved:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    closed: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5 ${map[status] ?? map.open}`}
    >
      {status}
    </span>
  );
}

// Slim top bar for the interior pages.
export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card/70 backdrop-blur-md">
      <Logo />
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
