import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const ev = await convex.query(api.events.getById, { id: eventId });
    if (!ev || !ev.isPublished) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const amountInCentavos = Math.round(ev.pricePhp * 100);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: paymongoHeaders(),
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: ev.title,
            line_items: [{
              currency: "PHP",
              amount: amountInCentavos,
              name: ev.title,
              quantity: 1,
            }],
            payment_method_types: ["gcash", "grab_pay", "paymaya", "card"],
            success_url: `${appUrl}/app?eventCheckout=success&eventId=${encodeURIComponent(eventId)}`,
            cancel_url: `${appUrl}/app?eventCheckout=canceled`,
            metadata: { kind: "event", userId, eventId },
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.errors?.[0]?.detail ?? "PayMongo checkout failed" }, { status: 500 });
    }
    return NextResponse.json({ url: data.data?.attributes?.checkout_url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Checkout failed" }, { status: 500 });
  }
}
