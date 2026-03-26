import { auth } from "@/lib/auth";
import { getDailyRoom } from "@/lib/daily";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const room = await getDailyRoom();
    return NextResponse.json(room);
  } catch (err) {
    console.error("[daily/room]", err);
    return NextResponse.json({ error: "Failed to get room" }, { status: 500 });
  }
}
