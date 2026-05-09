import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminId = process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID;
  if (!adminId || userId !== adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.userIds)) {
    return NextResponse.json({ error: "userIds must be an array" }, { status: 400 });
  }
  const userIds = body.userIds.filter((s): s is string => typeof s === "string").slice(0, 200);

  if (userIds.length === 0) return NextResponse.json({ users: [] });

  try {
    const clerk = await clerkClient();
    const result = await clerk.users.getUserList({ userId: userIds, limit: userIds.length });

    const users = result.data.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
