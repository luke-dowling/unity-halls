import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

function isDm(session: { user: { role: string } }) {
  return session.user.role === "DM";
}

const addSchema = z.object({
  soundtrackId: z.string(),
  trackId: z.string(),
});

// POST: add an existing track to a soundtrack
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { soundtrackId, trackId } = parsed.data;

  const [soundtrack, track] = await Promise.all([
    prisma.soundtrack.findUnique({ where: { id: soundtrackId } }),
    prisma.track.findUnique({ where: { id: trackId } }),
  ]);
  if (!soundtrack) return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
  if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

  const existing = await prisma.soundtrackTrack.findUnique({
    where: { soundtrackId_trackId: { soundtrackId, trackId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Track already in soundtrack" }, { status: 409 });
  }

  const maxPos = await prisma.soundtrackTrack.aggregate({
    where: { soundtrackId },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  await prisma.soundtrackTrack.create({ data: { soundtrackId, trackId, position } });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE: remove a track from a soundtrack (does not delete the Track record)
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const soundtrackId = searchParams.get("soundtrackId");
  const trackId = searchParams.get("trackId");

  if (!soundtrackId || !trackId) {
    return NextResponse.json({ error: "Missing soundtrackId or trackId" }, { status: 400 });
  }

  const existing = await prisma.soundtrackTrack.findUnique({
    where: { soundtrackId_trackId: { soundtrackId, trackId } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Track not in soundtrack" }, { status: 404 });
  }

  await prisma.soundtrackTrack.delete({
    where: { soundtrackId_trackId: { soundtrackId, trackId } },
  });

  return NextResponse.json({ ok: true });
}
