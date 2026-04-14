import { auth } from "@/lib/auth";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

function isDm(session: { user: { role: string } }) {
  return session.user.role === "DM";
}

const themeSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  backgroundUrl: z.string().url().or(z.literal("")),
  musicUrls: z.array(z.string().url()).default([]),
});

const updateThemeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  backgroundUrl: z.string().url().or(z.literal("")).optional(),
  musicUrls: z.array(z.string().url()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const themes = await prisma.theme.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(themes);
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

  const parsed = themeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.theme.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json({ error: "Theme ID already exists" }, { status: 409 });
  }

  const theme = await prisma.theme.create({ data: parsed.data });
  return NextResponse.json(theme, { status: 201 });
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
    return NextResponse.json({ error: "Missing theme id" }, { status: 400 });
  }

  const parsed = updateThemeSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const theme = await prisma.theme.update({ where: { id }, data: parsed.data });

  // Clean up replaced Cloudinary assets after the DB update succeeds.
  const deletions: Promise<void>[] = [];
  if (parsed.data.backgroundUrl !== undefined && existing.backgroundUrl && parsed.data.backgroundUrl !== existing.backgroundUrl) {
    deletions.push(deleteCloudinaryAsset(existing.backgroundUrl));
  }
  if (parsed.data.musicUrls !== undefined) {
    for (const oldUrl of existing.musicUrls) {
      if (!parsed.data.musicUrls.includes(oldUrl)) {
        deletions.push(deleteCloudinaryAsset(oldUrl));
      }
    }
  }
  await Promise.all(deletions);

  return NextResponse.json(theme);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing theme id" }, { status: 400 });
  }

  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  // Unlink any room states pointing to this theme
  await prisma.roomState.updateMany({
    where: { themeId: id },
    data: { themeId: null },
  });

  await prisma.theme.delete({ where: { id } });

  // Clean up Cloudinary assets after the record is deleted.
  const deletions: Promise<void>[] = [];
  if (existing.backgroundUrl) deletions.push(deleteCloudinaryAsset(existing.backgroundUrl));
  for (const url of existing.musicUrls) deletions.push(deleteCloudinaryAsset(url));
  await Promise.all(deletions);

  return NextResponse.json({ ok: true });
}
