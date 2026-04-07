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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(course.priceUsd * 100),
            product_data: {
              name: course.title,
              description: course.description?.slice(0, 200) || undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app?courseCheckout=success&courseId=${encodeURIComponent(courseId)}`,
      cancel_url: `${appUrl}/app?courseCheckout=canceled`,
      metadata: { kind: "course", userId, courseId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
