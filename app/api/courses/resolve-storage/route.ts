import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { storageId } = await req.json();
  if (!storageId) return NextResponse.json({ error: "storageId required" }, { status: 400 });

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const url = await convex.query(api.courses.getStorageUrl, { storageId });
  return NextResponse.json({ url });
}
