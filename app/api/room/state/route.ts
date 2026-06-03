import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  backgroundId: z.string().min(1).max(50).optional(),
  soundtrackId: z.string().min(1).max(50).optional(),
}).refine((d) => d.backgroundId !== undefined || d.soundtrackId !== undefined, {
  message: "At least one of backgroundId or soundtrackId is required",
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", backgroundId: "world-map", isLive: false },
    update: {},
    include: { background: true, soundtrack: true },
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

  if (parsed.data.backgroundId) {
    const background = await prisma.background.findUnique({ where: { id: parsed.data.backgroundId } });
    if (!background) {
      return NextResponse.json({ error: "Background not found" }, { status: 404 });
    }
  }

  if (parsed.data.soundtrackId) {
    const soundtrack = await prisma.soundtrack.findUnique({ where: { id: parsed.data.soundtrackId } });
    if (!soundtrack) {
      return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
    }
  }

  const state = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: parsed.data,
    include: { background: true, soundtrack: true },
  });

  return NextResponse.json(state);
}
