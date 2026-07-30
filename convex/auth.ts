import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";
import { seedOrdersForCustomer } from "./orders";

// Agents are provisioned by a server-side email allowlist (Convex env var
// AGENT_EMAILS, comma-separated). Everyone else is a customer. Because this is
// evaluated on the server at account creation, a client can never choose or
// escalate its own role.
function roleForEmail(email: string | undefined): "customer" | "agent" {
  const allow = (process.env.AGENT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  if (email && allow.includes(email.toLowerCase())) return "agent";
  return "customer";
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],

  // --- Session handshake configuration -------------------------------------
  // Convex Auth maintains the session with a signed JWT access token that is
  // verified statelessly on every request via JWKS (no server-side session
  // lookup for per-request auth). A separate refresh token is used only to mint
  // new access tokens. This is the token-based handshake that supplements the
  // Google sign-up flow.
  session: {
    // Hard cap: the user must re-authenticate after this long regardless.
    totalDurationMs: 1000 * 60 * 60 * 24 * 30, // 30 days
    // Idle timeout: session ends if unused for this long.
    inactiveDurationMs: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  jwt: {
    // Access-token lifetime. When it expires mid-session, the client silently
    // exchanges the refresh token for a new one; the user notices nothing.
    // Only when the refresh token itself is expired/revoked does the client
    // become unauthenticated (handled by AuthGate on the frontend).
    durationMs: 1000 * 60 * 60, // 1 hour
  },

  callbacks: {
    // Runs on every sign-in. We provision a profile exactly once per user.
    // The callback ctx is generically typed; cast to our app's MutationCtx so
    // the `profiles` table and its index are known to TypeScript.
    async afterUserCreatedOrUpdated(genericCtx, { userId, profile }) {
      const ctx = genericCtx as unknown as MutationCtx;
      const email =
        typeof profile.email === "string" ? profile.email : undefined;
      const role = roleForEmail(email);

      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();

      // Keep role in sync with the allowlist on every sign-in: create on first
      // login, and re-apply if the allowlist changed since last time.
      if (existing === null) {
        await ctx.db.insert("profiles", { userId, role });
        // Give brand-new customers some sample orders to work with.
        if (role === "customer") {
          await seedOrdersForCustomer(ctx, userId);
        }
      } else if (existing.role !== role) {
        await ctx.db.patch("profiles", existing._id, { role });
      }
    },
  },
});
