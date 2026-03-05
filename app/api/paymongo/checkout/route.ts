import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

function paymongoHeaders() {
  const secretKey = process.env.PAYMONGO_SECRET_KEY!;
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
  };
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId, interval } = await req.json();
  if (!planId || !interval) {
    return NextResponse.json({ error: "planId and interval are required" }, { status: 400 });
  }

  try {
    const convex = getConvex();

    // Look up the plan to get the price
    const plan = await convex.query(api.subscriptions.findPlanById, { planId });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const amount = interval === "year" ? plan.priceYearly : plan.priceMonthly;
    // PayMongo amounts are in centavos (PHP) — multiply by 100
    const amountInCentavos = Math.round(amount * 100);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create a PayMongo Checkout Session
    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: paymongoHeaders(),
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `${plan.name} Plan (${interval === "year" ? "Yearly" : "Monthly"})`,
            line_items: [
              {
                currency: "PHP",
                amount: amountInCentavos,
                name: `${plan.name} Plan - ${interval === "year" ? "Yearly" : "Monthly"}`,
                quantity: 1,
              },
            ],
            payment_method_types: [
              "gcash",
              "grab_pay",
              "paymaya",
              "card",
            ],
            success_url: `${appUrl}/?checkout=success`,
            cancel_url: `${appUrl}/?checkout=canceled`,
            metadata: {
              userId,
              planId: plan.planId,
              interval,
            },
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("PayMongo checkout error:", data);
      return NextResponse.json(
        { error: data.errors?.[0]?.detail ?? "PayMongo checkout failed" },
        { status: 500 }
      );
    }

    const checkoutUrl = data.data?.attributes?.checkout_url;
    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
