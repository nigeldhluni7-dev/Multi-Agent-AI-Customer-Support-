"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => {
    // The session ended mid-view (refresh token expired/revoked). Send the
    // user back to sign in, flagging why so we can show a message.
    router.replace("/signin?reason=expired");
  }, [router]);
  return null;
}

/**
 * Wraps protected page content. Convex tracks auth reactively:
 *  - AuthLoading  → still verifying the token / refreshing
 *  - Authenticated → a valid (possibly just-refreshed) token is present
 *  - Unauthenticated → the session is truly gone → redirect to sign in
 *
 * The silent access-token refresh happens inside the Convex client; this gate
 * only reacts to the terminal "session expired" state.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="grid place-items-center h-screen text-slate-400 text-sm">
          Verifying your session…
        </div>
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
