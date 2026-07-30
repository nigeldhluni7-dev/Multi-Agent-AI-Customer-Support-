# Northwind Support — Multi-Agent AI Customer Support & Automation Engine

A self-serve customer-support platform where an **AI assistant handles first-line
replies** and a **human agent team supervises escalations**. Built as a
production-representative MVP: real-time queues, strict per-customer data
isolation, a permanent audit trail, a structurally-scoped AI assistant, and a
live open-ticket count that stays correct under concurrent load.

- **Repository:** https://github.com/nigeldhluni7-dev/Multi-Agent-AI-Customer-Support-
- **Backend deployment (dev):** Convex `kindly-curlew-787`

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Database + server functions | **Convex** (reactive queries, transactional mutations, actions) |
| Web app / UI | **Next.js 16** (App Router, React 19) + **Tailwind CSS v4** |
| Authentication | **Convex Auth** with **Google OAuth** (JWT + refresh token) |
| AI assistant | **`@anthropic-ai/sdk`** — Claude (`claude-sonnet-5`) with tool use |
| Live open-ticket count | **Sharded counter** (custom, contention-free) |

---

## The five requirements and how each is satisfied

### (a) Real-time reply surfacing — "a reply reaches the agent queue with no manual refresh"

Every Convex `useQuery` is a **live subscription**. The agent queue is
`useQuery(api.tickets.agentQueue)`; the instant a mutation writes a ticket or
message the query reads, Convex recomputes it server-side and pushes the result
to every subscribed client. No polling, no websocket code, no refresh.

- Backend: [`convex/tickets.ts`](convex/tickets.ts) — `agentQueue`, `ticketThread`
- UI: [`app/agent/page.tsx`](app/agent/page.tsx), [`components/TicketThread.tsx`](components/TicketThread.tsx)

### (b) Per-identity access boundary — cross-customer access is *structurally impossible*

- **Roles** live in a `profiles` table, assigned server-side from an
  `AGENT_EMAILS` allowlist and re-synced on every sign-in — a client can never
  choose its own role. ([`convex/auth.ts`](convex/auth.ts))
- **Isolation** is enforced in the Convex functions, not the UI. Every ticket
  function derives identity from `getAuthUserId(ctx)` and calls
  `authorizeTicket()`, which **throws** if a customer touches a ticket that
  isn't theirs — so a direct API call is rejected too, not just a hidden button.
  ([`convex/authz.ts`](convex/authz.ts))
- **Token-based session handshake:** Convex Auth issues a **signed JWT** access
  token (verified statelessly via JWKS on every request — no server-side session
  lookup) plus a refresh token. Durations are set explicitly: JWT = 1 hour,
  session = 30-day cap / 7-day idle.
- **Token expiry mid-session:** the access token silently refreshes via the
  refresh token; when the session truly ends,
  [`components/AuthGate.tsx`](components/AuthGate.tsx) detects the unauthenticated
  state and redirects to `/signin?reason=expired` with a "session expired" notice.

### (c) Permanent, auditable record

An **append-only** `auditLog` table records every ticket and assistant action —
rows are only ever inserted (no patch/delete path), so a closed case can be
reconstructed long afterward. Logged events include `ticket_created`,
`message_posted`, `ticket_status_changed`, `assistant_started`,
`assistant_reply`, and each tool call (`tool_get_order`,
`tool_set_order_status`, …). Agents view the full chronology in the ticket's
**Audit** panel. ([`convex/audit.ts`](convex/audit.ts))

### (d) Scoped assistant actions — the AI cannot act outside the served customer

The assistant reaches order data through **one** per-customer boundary,
[`convex/customerScope.ts`](convex/customerScope.ts) — the *same* helpers the
customer-facing UI uses, never a separate more-permissive path. The assistant's
shape is: **receive** the ticket message → **resolve** it to a single
customer identity (`ticket.customerId`, server-derived) → **invoke** only the
permitted, scoped operations (`list_orders`, `get_order`, `set_order_status`).
The model never supplies a customer id; it is injected server-side, so no prompt
can make a tool read another customer's data.

> Proven with a two-customer test: customer B could read/modify its own order but
> **could not** read or modify customer A's order through the boundary — even
> when calling the helpers directly (no LLM involved).

### (e) Live, concurrency-correct open-ticket count

**Design decision (and why):**

- A naive `count()` scan is unbounded and doesn't scale.
- A single hand-incremented counter document makes **every** ticket write contend
  on one row — OCC conflicts and lost throughput during a busy queue.
- `@convex-dev/aggregate` was tried and **removed**: under a 20-writes-at-once
  burst its internal B-tree nodes contended and mutations failed after exhausting
  retries — the exact "busy period" failure the requirement warns about.
- **Chosen: a sharded counter** ([`convex/ticketStats.ts`](convex/ticketStats.ts)).
  The count is split across 16 shard rows; each `+1/-1` lands on a random shard,
  so concurrent writers rarely touch the same document. It is updated in the
  **same transaction** as each ticket write (so it can't drift), and the count is
  the sum of the shards, exposed as a normal Convex query — hence **live**.

> Proven under load: through **20 concurrent opens + 8 concurrent resolves**, the
> counter matched a ground-truth table scan at every step (33→33, 25→25), with
> zero errors. The badge on the agent queue updates in real time as agents
> Resolve/Reopen tickets.

---

## AI assistant usage

- **Where:** [`convex/assistant.ts`](convex/assistant.ts) — a Convex Node action
  (`generateReply`) triggered when a customer opens a ticket or replies.
- **Model:** `claude-sonnet-5` (override with `ANTHROPIC_MODEL`).
- **Temperature:** read from `ANTHROPIC_TEMPERATURE` (default `0.7`). Claude 5
  models deprecate `temperature`, so it is **omitted for Claude 5** and sent only
  for older models.
- **Tools:** `list_orders`, `get_order`, `set_order_status` — each an internal
  Convex function bound to the served `customerId` via `customerScope.ts`.
- **Loop:** a bounded (max 6 rounds) tool-use loop; every tool call is written to
  the audit trail; the final reply is posted into the ticket thread (and appears
  live in the agent queue).
- **Resilience:** if `ANTHROPIC_API_KEY` is missing or the call fails, the
  assistant posts a visible fallback message and records an audit event.

---

## Environment configuration

### Convex deployment env vars (set with `npx convex env set <NAME> <value>`)

| Variable | Purpose |
| --- | --- |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials |
| `JWKS` / `JWT_PRIVATE_KEY` / `SITE_URL` | Session signing/verification (created by the Convex Auth CLI) |
| `AGENT_EMAILS` | Comma-separated allowlist of emails that become **agents** |
| `ANTHROPIC_API_KEY` | Claude API key (assistant) |
| `ANTHROPIC_MODEL` | Optional, default `claude-sonnet-5` |
| `ANTHROPIC_TEMPERATURE` | Optional, default `0.7` (ignored by Claude 5 models) |

> Secrets live **only** on the Convex deployment — never in `.env.local` or git.

### Local app env vars (`.env.local`, git-ignored)

`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`.

### Google Cloud setup

1. Create an OAuth 2.0 **Web** client.
2. Authorized origin: `http://localhost:3000`.
3. Authorized redirect URI:
   `https://kindly-curlew-787.convex.site/api/auth/callback/google`.
4. Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` on Convex.

---

## Running locally

```bash
npm install
npm run dev
```

Then, on the Convex deployment: set `AGENT_EMAILS` to the email you'll use as an
agent, and `ANTHROPIC_API_KEY` to your Claude key. Sign out/in so your role
re-syncs.

**Try it:** open `/tickets` (customer) and `/agent` (agent) in two windows →
open a ticket → the AI replies and it appears live in the queue → Resolve it and
watch the live count tick down.

---

## How correctness was verified

- **Assistant (end-to-end):** ran the real Claude loop — it called `get_order`,
  replied with the correct order status, and logged `assistant_started →
  tool_get_order → assistant_reply` to the audit trail.
- **Scoped boundary:** two-customer test — B cannot read or modify A's order.
- **Concurrency-correct count:** 20 concurrent opens + 8 concurrent resolves; the
  sharded counter matched a ground-truth scan at every step.
- **Types:** `npx tsc --noEmit` passes; Convex functions typecheck on every deploy.
- **UI:** renders with no console errors; mobile (375px) has no horizontal overflow.

---

## Interface & UX

- Cohesive design system (design tokens, Geist fonts, gradient logo mark).
- **Google profile picture** + dropdown menu; editable `/profile` page.
- Fully **responsive**: a master–detail layout — list on mobile, tap to open the
  thread full-screen with a back button; side-by-side on tablet/desktop.
- Chat with role avatars and timestamps; a collapsible audit panel.

---

## Project structure

```
convex/
  schema.ts          tables: profiles, tickets, messages, orders, auditLog, counterShards
  auth.ts            Convex Auth (Google), roles, session/JWT config
  authz.ts           server-side identity + authorization helpers
  tickets.ts         queues, ticket thread, create/reply, agent status changes
  customerScope.ts   THE per-customer data boundary (deliverable d)
  orders.ts          customer orders + assistant order tools
  assistant.ts       Claude tool-use loop (Node action)
  audit.ts           append-only audit log + viewer
  ticketStats.ts     sharded open-ticket counter (concurrency-correct)
app/
  page.tsx           home (role-aware entry cards)
  signin/            Google sign-in + "session expired" notice
  tickets/           customer view (create, chat, orders)
  agent/             agent queue + live count + status controls
  profile/           editable profile (Google avatar)
components/
  ui.tsx             logo, avatars, badges, profile menu, top bar
  TicketThread.tsx   shared conversation + audit panel
  AuthGate.tsx       session-expiry handling
proxy.ts             route protection / auth redirects (Next.js middleware)
```

---

## Development log (build order)

1. **Auth foundation.** Added the Convex Auth Google sign-in page, wired the
   client/server providers, and confirmed the middleware redirect flow.
2. **Real-time queue (a).** Modeled `tickets` + `messages`; built the reactive
   `agentQueue` and a customer/agent split UI so replies surface with no refresh.
3. **Removed the Convex demo** and replaced it with the Northwind Support product
   (home, rebranded sign-in, real navigation).
4. **Identity & isolation (b).** Added `profiles`/roles, the `authz.ts`
   authorization layer (structural cross-customer rejection), explicit
   JWT/session durations, and the `AuthGate` for mid-session expiry.
5. **Audit trail + AI assistant (c).** Added the append-only `auditLog`, the
   `orders` table, and the Claude tool-use assistant; wired auditing into every
   ticket and assistant action; added the agent audit panel.
6. **Scoped assistant boundary (d).** Unified all customer-order access into the
   single `customerScope.ts` boundary shared by the UI and the assistant; proved
   isolation with a two-customer test.
7. **Interface upgrade.** Design system, gradient logo, Google profile picture +
   editable profile, and full mobile→desktop responsiveness.
8. **Assistant verification.** Fixed the model id (→ `claude-sonnet-5`) and the
   Claude-5 `temperature` deprecation; verified the full loop end-to-end.
9. **Live concurrency-correct count (e).** Tried `@convex-dev/aggregate`, found it
   contends under bursty concurrent writes, and replaced it with a sharded
   counter; proved correctness under 20 concurrent opens + 8 resolves; added the
   live badge and agent Resolve/Reopen controls.

Each milestone was committed separately for a coherent history.
