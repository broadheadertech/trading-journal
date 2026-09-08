import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser, getUser } from "./helpers";
import type { Id } from "./_generated/dataModel";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(ctx: any): Promise<string> {
  const userId = await requireUser(ctx);
  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) throw new Error("Forbidden");
  return userId;
}

// ─── File upload (shared pattern with forum/coaches) ────────────────
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve an uploaded storageId to a public URL (avoids a separate API route). */
export const resolveUpload = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(storageId as Id<"_storage">);
  },
});

// ─── User-facing ────────────────────────────────────────────────────

/** The active QR codes a user can scan to pay. Auth-gated but not admin-only. */
export const getActiveMethods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const methods = await ctx.db
      .query("qrPaymentMethods")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return methods.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/** The signed-in user's own submissions, newest first (for status display). */
export const getMySubmissions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUser(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("qrPaymentSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const submitPayment = mutation({
  args: {
    planId: v.string(),
    planName: v.optional(v.string()),
    interval: v.union(v.literal("month"), v.literal("year")),
    methodId: v.optional(v.id("qrPaymentMethods")),
    methodLabel: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    referenceId: v.string(),
    screenshotUrl: v.string(),
    note: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (!args.referenceId.trim()) throw new Error("Reference ID is required");
    if (!args.screenshotUrl) throw new Error("Payment screenshot is required");

    const now = new Date().toISOString();
    const id = await ctx.db.insert("qrPaymentSubmissions", {
      userId,
      userName: args.userName,
      userEmail: args.userEmail,
      planId: args.planId,
      planName: args.planName,
      interval: args.interval,
      methodId: args.methodId,
      methodLabel: args.methodLabel,
      amount: args.amount,
      currency: args.currency,
      referenceId: args.referenceId.trim(),
      screenshotUrl: args.screenshotUrl,
      note: args.note,
      status: "pending",
      createdAt: now,
    });

    await ctx.db.insert("adminEvents", {
      type: "qr_payment_submitted",
      userId,
      metadata: JSON.stringify({ planId: args.planId, interval: args.interval, referenceId: args.referenceId.trim() }),
      timestamp: now,
    });

    return id;
  },
});

// ─── Admin: QR method management ────────────────────────────────────

export const listMethods = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const methods = await ctx.db.query("qrPaymentMethods").collect();
    return methods.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const createMethod = mutation({
  args: {
    label: v.string(),
    qrImageUrl: v.string(),
    instructions: v.optional(v.string()),
    accountDetails: v.optional(v.string()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = new Date().toISOString();
    const existing = await ctx.db.query("qrPaymentMethods").collect();
    const sortOrder = existing.length;
    return await ctx.db.insert("qrPaymentMethods", {
      label: args.label,
      qrImageUrl: args.qrImageUrl,
      instructions: args.instructions,
      accountDetails: args.accountDetails,
      currency: args.currency,
      isActive: true,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateMethod = mutation({
  args: {
    id: v.id("qrPaymentMethods"),
    label: v.optional(v.string()),
    qrImageUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    accountDetails: v.optional(v.string()),
    currency: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireAdmin(ctx);
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...clean, updatedAt: new Date().toISOString() });
  },
});

export const deleteMethod = mutation({
  args: { id: v.id("qrPaymentMethods") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// ─── Admin: submission review ───────────────────────────────────────

export const listSubmissions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("qrPaymentSubmissions").collect();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

function periodEndFrom(interval: "month" | "year"): string {
  const d = new Date();
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export const approveSubmission = mutation({
  args: { id: v.id("qrPaymentSubmissions") },
  handler: async (ctx, { id }) => {
    const adminId = await requireAdmin(ctx);
    const sub = await ctx.db.get(id);
    if (!sub) throw new Error("Submission not found");
    if (sub.status === "approved") return;

    const now = new Date().toISOString();

    // Mark the submission approved
    await ctx.db.patch(id, { status: "approved", reviewedBy: adminId, reviewedAt: now });

    // Activate the user's subscription (mirrors the Stripe webhook path)
    const existing = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", sub.userId))
      .first();

    const subFields = {
      planId: sub.planId,
      status: "active" as const,
      interval: sub.interval,
      paymentProvider: "qr" as const,
      currentPeriodEnd: periodEndFrom(sub.interval),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, subFields);
    } else {
      await ctx.db.insert("userSubscriptions", {
        userId: sub.userId,
        stripeCustomerId: "",
        createdAt: now,
        ...subFields,
      });
    }

    // Notify the user
    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: "payment_approved",
      title: "Payment approved 🎉",
      message: `Your ${sub.planName ?? sub.planId} subscription is now active. Welcome aboard!`,
      read: false,
      link: "/app",
      timestamp: now,
    });

    await ctx.db.insert("adminEvents", {
      type: "qr_payment_approved",
      userId: sub.userId,
      adminId,
      metadata: JSON.stringify({ planId: sub.planId, interval: sub.interval, submissionId: id }),
      timestamp: now,
    });
  },
});

export const rejectSubmission = mutation({
  args: { id: v.id("qrPaymentSubmissions"), reason: v.optional(v.string()) },
  handler: async (ctx, { id, reason }) => {
    const adminId = await requireAdmin(ctx);
    const sub = await ctx.db.get(id);
    if (!sub) throw new Error("Submission not found");

    const now = new Date().toISOString();
    await ctx.db.patch(id, {
      status: "rejected",
      reviewNote: reason,
      reviewedBy: adminId,
      reviewedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: sub.userId,
      type: "payment_rejected",
      title: "Payment could not be verified",
      message: reason?.trim()
        ? `We couldn't verify your payment: ${reason.trim()}. Please re-submit or contact support.`
        : "We couldn't verify your payment. Please double-check your reference ID and re-submit, or contact support.",
      read: false,
      link: "/app",
      timestamp: now,
    });

    await ctx.db.insert("adminEvents", {
      type: "qr_payment_rejected",
      userId: sub.userId,
      adminId,
      metadata: JSON.stringify({ submissionId: id, reason: reason ?? "" }),
      timestamp: now,
    });
  },
});
