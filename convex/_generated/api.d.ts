/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as assistant from "../assistant.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as customerScope from "../customerScope.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as statsTest from "../statsTest.js";
import type * as ticketStats from "../ticketStats.js";
import type * as tickets from "../tickets.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  assistant: typeof assistant;
  audit: typeof audit;
  auth: typeof auth;
  authz: typeof authz;
  customerScope: typeof customerScope;
  http: typeof http;
  orders: typeof orders;
  statsTest: typeof statsTest;
  ticketStats: typeof ticketStats;
  tickets: typeof tickets;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
