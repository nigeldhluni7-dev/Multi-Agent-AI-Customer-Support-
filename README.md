# Northwind Support: Multi-Agent AI Customer Support

This project is a Convex + Next.js support system with:
- customer and agent roles,
- live support queues,
- AI assistant responses,
- order lookup/update tools,
- and a permanent audit trail for every ticket action.

## Stack

- `Convex` for database + server functions
- `Next.js` for web app routing and UI
- `Convex Auth` with Google OAuth
- `@anthropic-ai/sdk` for AI assistant responses
- `@convex-dev/aggregate` for concurrency-safe live ticket counts

## Current Features

- **Google sign-in** through Convex Auth.
- **Role-aware access control** (`customer` vs `agent`) enforced server-side.
- **Customer ticket flow**: create tickets, post replies, view own tickets.
- **Agent queue**: see open tickets live, update ticket statuses.
- **AI assistant**: generates replies and can use tools scoped to the active customer only.
- **Order tools for AI**: list orders, fetch one order, update order status.
- **Permanent audit log**: append-only records for ticket and assistant activity.
- **Live open-ticket count** backed by aggregate component updates in the same mutation transaction.

## Permanent Auditable Record (What Was Implemented)

The backend now records an auditable, append-only trail for each ticket in `auditLog`:
- `ticket_created`
- `message_posted`
- `ticket_status_changed`
- `assistant_started`
- `assistant_reply`
- assistant tool calls such as:
  - `tool_list_orders`
  - `tool_get_order`
  - `tool_set_order_status`
- system-level safety events (for example missing AI configuration)

Important behavior:
- Audit rows are inserted only (no patch/delete path).
- `ticketAuditLog` returns full chronology for authorized users.
- Authorization is enforced before audit/ticket thread access.

## Security + Isolation Design

- Identity is always derived server-side from auth token (never accepted from client args).
- Customers can access only their own tickets/orders.
- Agents can access all tickets.
- Assistant tools operate via customer-scoped helpers and cannot escape tenant boundaries.
- Agent role assignment is done server-side using `AGENT_EMAILS` allowlist.

## AI Assistant Integration

Assistant action: `convex/assistant.ts`
- Uses Anthropic SDK in a Convex Node action.
- Reads:
  - `ANTHROPIC_API_KEY`
  - optional `ANTHROPIC_MODEL` (default `claude-sonnet-5`)
  - optional `ANTHROPIC_TEMPERATURE` (default `0.7`)
- For Claude 5 family models, temperature is omitted (as required by model behavior).
- If no API key is set, assistant writes a visible fallback message and audit record.

## Authentication Setup (Google + Convex Auth)

Implemented in code:
- `convex/auth.ts` configured with `Google` provider.
- Next.js auth provider wiring already active.
- Sign-in page updated to "Continue with Google".

Google Cloud setup required:
1. Create Google OAuth client (Web app).
2. Add origin: `http://localhost:3000`
3. Add callback:
   - `https://kindly-curlew-787.convex.site/api/auth/callback/google`
4. Set Convex env vars:
   - `npx convex env set AUTH_GOOGLE_ID <client_id>`
   - `npx convex env set AUTH_GOOGLE_SECRET <client_secret>`

## Environment Variables

### Convex deployment env vars

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SITE_URL` (example: `http://localhost:3000`)
- `AGENT_EMAILS` (comma-separated allowlist for agent role)
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (optional)
- `ANTHROPIC_TEMPERATURE` (optional, default `0.7`)

### Local app env vars (`.env.local`)

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`

## Run Locally

```bash
npm install
npm run dev
```

## Verification Checklist

1. Sign in with Google at `/signin`.
2. Create a customer ticket.
3. Confirm assistant posts a reply.
4. Confirm assistant can read/update only that customer's orders.
5. Open agent queue and confirm live open-ticket count updates.
6. Change ticket status and verify audit entries are appended.
7. Open ticket audit timeline and verify complete chronology.

## Repository Notes

- `convex/` contains backend schema, auth, tickets, orders, audit, and assistant actions.
- `app/` and `components/` contain protected frontend views and sign-in UX.
- This README is the running implementation record and can be extended on each milestone.
