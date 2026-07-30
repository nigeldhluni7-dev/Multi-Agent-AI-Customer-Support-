import { query } from "./_generated/server";
import { getViewer } from "./authz";

// The currently signed-in user (identity + role), or null if not authenticated.
export const viewer = query({
  args: {},
  handler: async (ctx) => getViewer(ctx),
});
