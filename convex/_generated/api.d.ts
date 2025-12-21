/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as chat from "../chat.js";
import type * as gigs from "../gigs.js";
import type * as http from "../http.js";
import type * as logs from "../logs.js";
import type * as paymentActions from "../paymentActions.js";
import type * as payments from "../payments.js";
import type * as profiles from "../profiles.js";
import type * as projectRequests from "../projectRequests.js";
import type * as projects from "../projects.js";
import type * as proposals from "../proposals.js";
import type * as razorpay from "../razorpay.js";
import type * as recommendations from "../recommendations.js";
import type * as router from "../router.js";
import type * as storage from "../storage.js";
import type * as verification from "../verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  chat: typeof chat;
  gigs: typeof gigs;
  http: typeof http;
  logs: typeof logs;
  paymentActions: typeof paymentActions;
  payments: typeof payments;
  profiles: typeof profiles;
  projectRequests: typeof projectRequests;
  projects: typeof projects;
  proposals: typeof proposals;
  razorpay: typeof razorpay;
  recommendations: typeof recommendations;
  router: typeof router;
  storage: typeof storage;
  verification: typeof verification;
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
