import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const clerk = await clerkClient();
    const result = await clerk.users.getUserList({
      query,
      limit: 10,
    });

    const users = result.data.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
