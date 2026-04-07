import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const ev = await convex.query(api.events.getById, { id: eventId });
    if (!ev || !ev.isPublished) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(ev.priceUsd * 100),
          product_data: {
            name: ev.title,
            description: ev.description?.slice(0, 200) || undefined,
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/app?eventCheckout=success&eventId=${encodeURIComponent(eventId)}`,
      cancel_url: `${appUrl}/app?eventCheckout=canceled`,
      metadata: { kind: "event", userId, eventId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Checkout failed" }, { status: 500 });
  }
}
