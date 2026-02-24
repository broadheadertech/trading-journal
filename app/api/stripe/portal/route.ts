import { NextResponse } from "next/server";
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

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await getConvex().query(api.subscriptions.findByUser, { userId });

    if (!existing?.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await getStripe().billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: appUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal session failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
