import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  themeId: z.string().min(1).max(50),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", themeId: "world-map", isLive: false },
    update: {},
    include: { theme: true },
  });

  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "DM") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verify theme exists
  const theme = await prisma.theme.findUnique({ where: { id: parsed.data.themeId } });
  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const state = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", themeId: parsed.data.themeId },
    update: { themeId: parsed.data.themeId },
    include: { theme: true },
  });

  return NextResponse.json(state);
}
