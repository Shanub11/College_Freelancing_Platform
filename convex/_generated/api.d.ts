/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as gigs from "../gigs.js";
import type * as http from "../http.js";
import type * as profiles from "../profiles.js";
import type * as projects from "../projects.js";
import type * as router from "../router.js";
import type * as storage from "../storage.js";
import type * as verification from "../verification.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  gigs: typeof gigs;
  http: typeof http;
  profiles: typeof profiles;
  projects: typeof projects;
  router: typeof router;
  storage: typeof storage;
  verification: typeof verification;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
