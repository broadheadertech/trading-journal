import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

function getConvex() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

function verifySignature(payload: string, sigHeader: string): boolean {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  // PayMongo sends signatures in format: t=<timestamp>,te=<test_signature>,li=<live_signature>
  const parts = sigHeader.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signaturePart = parts.find((p) => p.startsWith("li=")) || parts.find((p) => p.startsWith("te="));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const signature = signaturePart.slice(3);

  // PayMongo HMAC: HMAC-SHA256(timestamp + "." + payload, webhook_secret)
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

export async function POST(req: NextRequest) {
  const convex = getConvex();
  const body = await req.text();
  const sig = req.headers.get("paymongo-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!verifySignature(body, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(body);
    const eventType = event.data?.attributes?.type;
    const eventData = event.data?.attributes?.data;

    switch (eventType) {
      case "checkout_session.payment.paid": {
        const attributes = eventData?.attributes;
        const metadata = attributes?.metadata;
        const userId = metadata?.userId;

        // Course one-time purchase
        if (metadata?.kind === "course") {
          const courseId = metadata?.courseId;
          if (!userId || !courseId) break;
          const lineItem = attributes?.line_items?.[0];
          const amountCentavos = lineItem?.amount ?? 0;
          await convex.mutation(api.courses.recordPurchase, {
            userId,
            courseId,
            paymentProvider: "paymongo",
            paymentId: eventData?.id ?? "",
            amount: amountCentavos / 100,
            currency: "PHP",
          });
          break;
        }

        // Event paid registration
        if (metadata?.kind === "event") {
          const evId = metadata?.eventId;
          if (!userId || !evId) break;
          const lineItem = attributes?.line_items?.[0];
          const amountCentavos = lineItem?.amount ?? 0;
          await convex.mutation(api.events.recordPaidRegistration, {
            userId,
            eventId: evId,
            paymentProvider: "paymongo",
            paymentId: eventData?.id ?? "",
            amount: amountCentavos / 100,
            currency: "PHP",
          });
          break;
        }

        const planId = metadata?.planId;
        const interval = metadata?.interval as "month" | "year" | undefined;

        if (!userId || !planId) break;

        const paymongoPaymentId = eventData?.id ?? "";
        const checkoutSessionId = attributes?.payment_intent?.id ?? attributes?.payments?.[0]?.id ?? "";

        // Calculate period end based on interval
        const now = new Date();
        const periodEnd = new Date(now);
        if (interval === "year") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId,
          stripeCustomerId: "", // Not a Stripe customer
          paymongoCustomerId: paymongoPaymentId,
          paymongoSubscriptionId: checkoutSessionId,
          paymentProvider: "paymongo",
          planId,
          status: "active",
          interval,
          currentPeriodEnd: periodEnd.toISOString(),
          cancelAtPeriodEnd: false,
        });

        // Unlock brain stage on upgrade
        await convex.mutation(api.brain.unlockStageOnUpgrade, { userId });
        break;
      }

      case "payment.failed": {
        const attributes = eventData?.attributes;
        const metadata = attributes?.metadata;
        const userId = metadata?.userId;

        if (!userId) break;

        const existing = await convex.query(api.subscriptions.findByUser, { userId });
        if (!existing) break;

        await convex.mutation(api.subscriptions.upsertSubscription, {
          userId,
          stripeCustomerId: existing.stripeCustomerId ?? "",
          paymongoCustomerId: existing.paymongoCustomerId,
          paymongoSubscriptionId: existing.paymongoSubscriptionId,
          paymentProvider: "paymongo",
          planId: existing.planId,
          status: "past_due",
        });
        break;
      }
    }
  } catch (err) {
    console.error("PayMongo webhook handler error:", err);
    return NextResponse.json({ received: true, error: "Handler error" });
  }

  return NextResponse.json({ received: true });
}
