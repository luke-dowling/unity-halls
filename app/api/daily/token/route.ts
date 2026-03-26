import { auth } from "@/lib/auth";
import { getDailyRoom, createDailyToken } from "@/lib/daily";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const room = await getDailyRoom();
    const isOwner = session.user.role === "DM";
    const userName = session.user.characterName ?? session.user.name;
    const token = await createDailyToken(room.name, userName, isOwner);
    return NextResponse.json({ token, url: room.url });
  } catch (err) {
    console.error("[daily/token]", err);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}
