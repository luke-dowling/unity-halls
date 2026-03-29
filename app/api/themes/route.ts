import { auth } from "@/lib/auth";
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
  return NextResponse.json({ ok: true });
}
