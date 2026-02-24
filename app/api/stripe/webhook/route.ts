import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const convex = getConvex();
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        // Fetch the full subscription from Stripe
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const item = sub.items.data[0];
        const priceId = item?.price.id;
        const interval = item?.price.recurring?.interval as "month" | "year" | undefined;
        const periodEnd = item?.current_period_end;

        // Map Stripe priceId to internal planId
        const plan = await convex.query(api.subscriptions.findPlanByStripePriceId, {
          stripePriceId: priceId ?? "",
        });

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: sub.id,
          planId: plan?.planId ?? "unknown",
          status: "active",
          interval,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const updItem = subscription.items.data[0];
        const priceId = updItem?.price.id;
        const interval = updItem?.price.recurring?.interval as "month" | "year" | undefined;
        const periodEnd = updItem?.current_period_end;

        const plan = await convex.query(api.subscriptions.findPlanByStripePriceId, {
          stripePriceId: priceId ?? "",
        });

        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "unpaid",
          incomplete: "incomplete",
          incomplete_expired: "canceled",
          paused: "canceled",
        };
        const mappedStatus = statusMap[subscription.status] ?? "canceled";

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          planId: plan?.planId ?? "unknown",
          status: mappedStatus as "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete" | "free",
          interval,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          planId: "free",
          status: "canceled",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (!customerId) break;

        // Look up user by stripe customer ID
        const existing = await convex.query(api.subscriptions.findByStripeCustomer, {
          stripeCustomerId: customerId,
        });
        if (!existing) break;

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId: existing.userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: existing.stripeSubscriptionId,
          planId: existing.planId,
          status: "past_due",
        });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 so Stripe doesn't retry (we logged the error)
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}
