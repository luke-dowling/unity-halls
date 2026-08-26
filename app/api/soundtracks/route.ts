import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(80),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
});

function mapSoundtrack(st: {
  id: string;
  name: string;
  tracks: { position: number; track: { id: string; name: string; url: string } }[];
}) {
  return {
    id: st.id,
    name: st.name,
    tracks: st.tracks
      .sort((a, b) => a.position - b.position)
      .map((t) => t.track),
  };
}

const includeTracksQuery = {
  tracks: {
    include: { track: true },
    orderBy: { position: "asc" as const },
  },
};

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const soundtracks = await prisma.soundtrack.findMany({
    orderBy: { name: "asc" },
    include: includeTracksQuery,
  });

  return NextResponse.json(soundtracks.map(mapSoundtrack));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const soundtrack = await prisma.soundtrack.create({
    data: { name: parsed.data.name },
    include: includeTracksQuery,
  });

  return NextResponse.json(mapSoundtrack(soundtrack), { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
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

  const existing = await prisma.soundtrack.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
  }

  const soundtrack = await prisma.soundtrack.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name },
    include: includeTracksQuery,
  });

  return NextResponse.json(mapSoundtrack(soundtrack));
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing soundtrack id" }, { status: 400 });
  }

  const existing = await prisma.soundtrack.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
  }

  await prisma.room.updateMany({
    where: { soundtrackId: id },
    data: { soundtrackId: null },
  });

  // Cascade in DB handles SoundtrackTrack deletion; Track records are preserved.
  await prisma.soundtrack.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
