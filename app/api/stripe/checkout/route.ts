import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { planId, interval } = body as { planId?: string; interval?: "month" | "year" };

  if (!planId || (interval !== "month" && interval !== "year")) {
    return NextResponse.json(
      { error: "planId and interval ('month' | 'year') are required" },
      { status: 400 },
    );
  }

  try {
    const convex = getConvex();

    // Resolve the plan and its Stripe priceId from the DB so callers don't need
    // to know Stripe-specific identifiers.
    const plan = await convex.query(api.subscriptions.findPlanById, { planId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const stripePriceId =
      interval === "year" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!stripePriceId) {
      return NextResponse.json(
        {
          error: `This plan has no Stripe ${interval}ly price configured. Set stripePriceId${interval === "year" ? "Yearly" : "Monthly"} on the subscriptionPlans row.`,
        },
        { status: 400 },
      );
    }

    // Look up existing Stripe customer for this user, create one if needed.
    const existing = await convex.query(api.subscriptions.findByUser, { userId });
    let stripeCustomerId = existing?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      // {CHECKOUT_SESSION_ID} is a Stripe placeholder — actually expanded by Stripe at redirect.
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/canceled`,
      metadata: { userId, planId: plan.planId, interval },
      subscription_data: { metadata: { userId, planId: plan.planId, interval } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
