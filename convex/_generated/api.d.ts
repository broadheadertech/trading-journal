/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminEvents from "../adminEvents.js";
import type * as checklists from "../checklists.js";
import type * as circuitBreakers from "../circuitBreakers.js";
import type * as goals from "../goals.js";
import type * as helpers from "../helpers.js";
import type * as journal from "../journal.js";
import type * as migrations from "../migrations.js";
import type * as profile from "../profile.js";
import type * as reflections from "../reflections.js";
import type * as ruleBreaks from "../ruleBreaks.js";
import type * as seed from "../seed.js";
import type * as strategies from "../strategies.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tierLimits from "../tierLimits.js";
import type * as trades from "../trades.js";
import type * as triggers from "../triggers.js";
import type * as weeklyReviews from "../weeklyReviews.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminEvents: typeof adminEvents;
  checklists: typeof checklists;
  circuitBreakers: typeof circuitBreakers;
  goals: typeof goals;
  helpers: typeof helpers;
  journal: typeof journal;
  migrations: typeof migrations;
  profile: typeof profile;
  reflections: typeof reflections;
  ruleBreaks: typeof ruleBreaks;
  seed: typeof seed;
  strategies: typeof strategies;
  subscriptions: typeof subscriptions;
  tierLimits: typeof tierLimits;
  trades: typeof trades;
  triggers: typeof triggers;
  weeklyReviews: typeof weeklyReviews;
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
