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
import type * as chat from "../chat.js";
import type * as editorHiring from "../editorHiring.js";
import type * as finance from "../finance.js";
import type * as hiring from "../hiring.js";
import type * as http from "../http.js";
import type * as milestoneTemplates from "../milestoneTemplates.js";
import type * as milestones from "../milestones.js";
import type * as missions from "../missions.js";
import type * as orders from "../orders.js";
import type * as payouts from "../payouts.js";
import type * as pricing from "../pricing.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chat: typeof chat;
  editorHiring: typeof editorHiring;
  finance: typeof finance;
  hiring: typeof hiring;
  http: typeof http;
  milestoneTemplates: typeof milestoneTemplates;
  milestones: typeof milestones;
  missions: typeof missions;
  orders: typeof orders;
  payouts: typeof payouts;
  pricing: typeof pricing;
  projects: typeof projects;
  seed: typeof seed;
  submissions: typeof submissions;
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
