"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "../../components/AuthGate";
import { TopBar, ProfileAvatar, RoleBadge } from "../../components/ui";

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileInner />
    </AuthGate>
  );
}

function ProfileInner() {
  const viewer = useQuery(api.users.viewer);
  const updateProfile = useMutation(api.users.updateMyProfile);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the input once the viewer loads.
  useEffect(() => {
    if (viewer?.name !== undefined && viewer?.name !== null) {
      setName(viewer.name);
    }
  }, [viewer?.name]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar viewer={viewer ?? undefined}>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          Home
        </Link>
      </TopBar>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Your profile
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Signed in with Google. Your email and role are managed by the
          platform.
        </p>

        {viewer === undefined ? (
          <div className="mt-8 text-slate-400 text-sm">Loading…</div>
        ) : viewer === null ? (
          <div className="mt-8 text-slate-400 text-sm">Not signed in.</div>
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <ProfileAvatar viewer={viewer} size={72} />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {viewer.name ?? "Unnamed user"}
                </p>
                <p className="text-sm text-slate-400 truncate">
                  {viewer.email}
                </p>
                <div className="mt-1">
                  <RoleBadge role={viewer.role} />
                </div>
              </div>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSaving(true);
                setSaved(false);
                void updateProfile({ name }).then(() => {
                  setSaving(false);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                });
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Display name
                </span>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="How should we address you?"
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email
                </span>
                <input
                  value={viewer.email ?? ""}
                  disabled
                  className="rounded-lg border border-border bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                {saved && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    ✓ Saved
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
