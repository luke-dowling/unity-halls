import { auth } from "@/actions/auth";
import { deleteCloudinaryAsset } from "@/actions/cloudinary";
import { prisma } from "@/actions/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().url(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tracks = await prisma.track.findMany({
    orderBy: { name: "asc" },
    include: {
      soundtracks: {
        select: { soundtrack: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(tracks);
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

  const track = await prisma.track.create({ data: parsed.data });
  return NextResponse.json(track, { status: 201 });
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

  const { id, ...data } = parsed.data;
  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const track = await prisma.track.update({ where: { id }, data });
  return NextResponse.json(track);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing track id" }, { status: 400 });
  }

  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  // Cascade in DB handles SoundtrackTrack deletion automatically.
  await prisma.track.delete({ where: { id } });
  await deleteCloudinaryAsset(existing.url);

  return NextResponse.json({ ok: true });
}
