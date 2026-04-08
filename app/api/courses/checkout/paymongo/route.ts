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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await req.json();
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  try {
    const convex = getConvex();
    const course = await convex.query(api.courses.getById, { id: courseId });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if (!course.isPublished) {
      return NextResponse.json({ error: "Course is not available" }, { status: 400 });
    }

    const amountInCentavos = Math.round(course.pricePhp * 100);
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
            description: course.title,
            line_items: [
              {
                currency: "PHP",
                amount: amountInCentavos,
                name: course.title,
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "grab_pay", "paymaya", "card"],
            success_url: `${appUrl}/app?courseCheckout=success&courseId=${encodeURIComponent(courseId)}`,
            cancel_url: `${appUrl}/app?courseCheckout=canceled`,
            metadata: { kind: "course", userId, courseId },
          },
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("PayMongo course checkout error:", data);
      return NextResponse.json(
        { error: data.errors?.[0]?.detail ?? "PayMongo checkout failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: data.data?.attributes?.checkout_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
