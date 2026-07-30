"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 grid place-items-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
            N
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Northwind Support
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Sign in to open tickets or work the support queue.
          </p>
          <Suspense fallback={null}>
            <ExpiredNotice />
          </Suspense>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <button
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium rounded-xl py-3 border border-border transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setError(null);
              void signIn("google").catch((err: Error) => {
                setError(err.message);
                setLoading(false);
              });
            }}
          >
            <GoogleIcon />
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>
          {error && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
              <p className="text-rose-600 dark:text-rose-300 text-sm break-words">
                {error}
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Protected by a token-based session · secure sign-in
        </p>
      </div>
    </div>
  );
}

function ExpiredNotice() {
  const reason = useSearchParams().get("reason");
  if (reason !== "expired") return null;
  return (
    <div className="w-full bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 mt-1">
      <p className="text-amber-700 dark:text-amber-300 text-sm">
        Your session expired. Please sign in again to continue.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.91 29.208 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.186 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
