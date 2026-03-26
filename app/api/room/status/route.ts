import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await prisma.roomState.findUnique({
    where: { id: "default" },
    select: { isLive: true },
  });

  return NextResponse.json({ isLive: state?.isLive ?? false });
}
