import { auth } from "@/lib/auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

function isDm(session: { user: { role: string } }) {
  return session.user.role === "DM";
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  trackUrls: z.array(z.string().url()).default([]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  trackUrls: z.array(z.string().url()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const soundtracks = await prisma.soundtrack.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(soundtracks);
}

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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const soundtrack = await prisma.soundtrack.create({ data: parsed.data });
  return NextResponse.json(soundtrack, { status: 201 });
}

export async function PUT(req: Request) {
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

  const { id, ...rest } = (body as Record<string, unknown>) ?? {};
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing soundtrack id" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.soundtrack.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Soundtrack not found" }, { status: 404 });
  }

  const soundtrack = await prisma.soundtrack.update({ where: { id }, data: parsed.data });

  // Clean up any Cloudinary tracks that were removed
  if (parsed.data.trackUrls !== undefined) {
    const removed = existing.trackUrls.filter((url) => !parsed.data.trackUrls!.includes(url));
    await Promise.all(removed.map((url) => deleteCloudinaryAsset(url)));
  }

  return NextResponse.json(soundtrack);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
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

  // Unlink from any room states pointing to this soundtrack
  await prisma.roomState.updateMany({
    where: { soundtrackId: id },
    data: { soundtrackId: null },
  });

  await prisma.soundtrack.delete({ where: { id } });

  // Clean up all Cloudinary tracks
  await Promise.all(existing.trackUrls.map((url) => deleteCloudinaryAsset(url)));

  return NextResponse.json({ ok: true });
}
