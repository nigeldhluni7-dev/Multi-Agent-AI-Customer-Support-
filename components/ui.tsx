"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export type ViewerLite = {
  email: string | null;
  name: string | null;
  role: string;
  image: string | null;
};

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="nwGrad"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#nwGrad)" />
      {/* speech bubble */}
      <rect x="7" y="11" width="26" height="15" rx="5" fill="#fff" />
      <path d="M13 25.5 L13 31 L19.5 25.5 Z" fill="#fff" />
      {/* typing dots = live support */}
      <circle cx="15" cy="18.5" r="1.7" fill="#6366F1" />
      <circle cx="20" cy="18.5" r="1.7" fill="#8B5CF6" />
      <circle cx="25" cy="18.5" r="1.7" fill="#6366F1" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <LogoMark size={32} />
      <span className="font-semibold text-slate-800 dark:text-slate-100 tracking-tight hidden sm:inline">
        Northwind Support
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Avatars & badges
// ---------------------------------------------------------------------------
const ROLE_STYLES: Record<string, { bg: string; label: string; letter: string }> =
  {
    customer: { bg: "bg-indigo-500", label: "Customer", letter: "C" },
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

function initials(name: string | null, email: string | null) {
  const source = name || email || "?";
  return source.slice(0, 2).toUpperCase();
}

// The user's Google profile picture, with a graceful initials fallback.
export function ProfileAvatar({
  viewer,
  size = 36,
}: {
  viewer: ViewerLite;
  size?: number;
}) {
  const dim = { width: size, height: size };
  if (viewer.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={viewer.image}
        alt={viewer.name ?? "Profile"}
        referrerPolicy="no-referrer"
        style={dim}
        className="rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
      />
    );
  }
  return (
    <span
      style={dim}
      className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center text-xs font-bold shadow-sm"
    >
      {initials(viewer.name, viewer.email)}
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

// ---------------------------------------------------------------------------
// User menu (profile picture → dropdown)
// ---------------------------------------------------------------------------
export function UserMenu({ viewer }: { viewer: ViewerLite }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full outline-none focus:ring-2 focus:ring-indigo-500/40"
        aria-label="Open profile menu"
      >
        <ProfileAvatar viewer={viewer} size={36} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-60 z-30 rounded-xl border border-border bg-card shadow-xl p-1.5">
            <div className="flex items-center gap-3 px-2.5 py-2">
              <ProfileAvatar viewer={viewer} size={40} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {viewer.name ?? "Your account"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {viewer.email}
                </p>
                <div className="mt-1">
                  <RoleBadge role={viewer.role} />
                </div>
              </div>
            </div>
            <div className="h-px bg-border my-1" />
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Edit profile
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                void signOut().then(() => router.push("/signin"));
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Slim top bar for interior pages.
export function TopBar({
  viewer,
  children,
}: {
  viewer?: ViewerLite | null;
  children?: ReactNode;
}) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-card/70 backdrop-blur-md">
      <Logo />
      <div className="flex items-center gap-2 sm:gap-4">
        {children}
        {viewer && <UserMenu viewer={viewer} />}
      </div>
    </header>
  );
}
