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
import type * as adminAnalytics from "../adminAnalytics.js";
import type * as adminEvents from "../adminEvents.js";
import type * as adminUserOps from "../adminUserOps.js";
import type * as articles from "../articles.js";
import type * as brain from "../brain.js";
import type * as brainAdmin from "../brainAdmin.js";
import type * as brainQueries from "../brainQueries.js";
import type * as checklists from "../checklists.js";
import type * as circuitBreakers from "../circuitBreakers.js";
import type * as coachMessages from "../coachMessages.js";
import type * as coachReviews from "../coachReviews.js";
import type * as coachSessions from "../coachSessions.js";
import type * as coaches from "../coaches.js";
import type * as cohorts from "../cohorts.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as discover from "../discover.js";
import type * as events from "../events.js";
import type * as feed from "../feed.js";
import type * as follows from "../follows.js";
import type * as forum from "../forum.js";
import type * as goals from "../goals.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as lib_antiGaming from "../lib/antiGaming.js";
import type * as lib_coachingTemplates from "../lib/coachingTemplates.js";
import type * as lib_neuroScore from "../lib/neuroScore.js";
import type * as migrations from "../migrations.js";
import type * as mtConnections from "../mtConnections.js";
import type * as newsletter from "../newsletter.js";
import type * as notifications from "../notifications.js";
import type * as profile from "../profile.js";
import type * as reflections from "../reflections.js";
import type * as ruleBreaks from "../ruleBreaks.js";
import type * as scoreEvents from "../scoreEvents.js";
import type * as seed from "../seed.js";
import type * as signalSocial from "../signalSocial.js";
import type * as signals from "../signals.js";
import type * as strategies from "../strategies.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tierLimits from "../tierLimits.js";
import type * as trades from "../trades.js";
import type * as triggers from "../triggers.js";
import type * as weeklyReviews from "../weeklyReviews.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAnalytics: typeof adminAnalytics;
  adminEvents: typeof adminEvents;
  adminUserOps: typeof adminUserOps;
  articles: typeof articles;
  brain: typeof brain;
  brainAdmin: typeof brainAdmin;
  brainQueries: typeof brainQueries;
  checklists: typeof checklists;
  circuitBreakers: typeof circuitBreakers;
  coachMessages: typeof coachMessages;
  coachReviews: typeof coachReviews;
  coachSessions: typeof coachSessions;
  coaches: typeof coaches;
  cohorts: typeof cohorts;
  courses: typeof courses;
  crons: typeof crons;
  discover: typeof discover;
  events: typeof events;
  feed: typeof feed;
  follows: typeof follows;
  forum: typeof forum;
  goals: typeof goals;
  helpers: typeof helpers;
  http: typeof http;
  journal: typeof journal;
  "lib/antiGaming": typeof lib_antiGaming;
  "lib/coachingTemplates": typeof lib_coachingTemplates;
  "lib/neuroScore": typeof lib_neuroScore;
  migrations: typeof migrations;
  mtConnections: typeof mtConnections;
  newsletter: typeof newsletter;
  notifications: typeof notifications;
  profile: typeof profile;
  reflections: typeof reflections;
  ruleBreaks: typeof ruleBreaks;
  scoreEvents: typeof scoreEvents;
  seed: typeof seed;
  signalSocial: typeof signalSocial;
  signals: typeof signals;
  strategies: typeof strategies;
  subscriptions: typeof subscriptions;
  tierLimits: typeof tierLimits;
  trades: typeof trades;
  triggers: typeof triggers;
  weeklyReviews: typeof weeklyReviews;
  workspaces: typeof workspaces;
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
