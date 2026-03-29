import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8),
  characterName: z.string().min(1).max(80).optional(),
  playerClass: z.enum(["CLERIC", "RANGER", "BLOOD_HUNTER", "PALADIN", "SORCERER"]).optional(),
  seatIndex: z.number().int().min(1).max(5).optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portraitUrl: z.string().url().optional(),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8).optional(),
  characterName: z.string().min(1).max(80).optional(),
  playerClass: z.enum(["CLERIC", "RANGER", "BLOOD_HUNTER", "PALADIN", "SORCERER"]).optional(),
  seatIndex: z.number().int().min(1).max(5).nullable().optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portraitUrl: z.string().url().or(z.literal("")).optional(),
});

function isDm(session: { user: { role: string } }) {
  return session.user.role === "DM";
}

export async function GET() {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, characterName: true, portraitId: true, portraitUrl: true, playerClass: true, seatIndex: true, shadowColor: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { email, name, password, characterName, playerClass, seatIndex, shadowColor, portraitUrl } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  if (seatIndex !== undefined) {
    const seatTaken = await prisma.user.findUnique({ where: { seatIndex } });
    if (seatTaken) {
      return NextResponse.json({ error: `Seat ${seatIndex} is already taken` }, { status: 409 });
    }
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, characterName, playerClass, seatIndex, shadowColor, portraitUrl },
    select: { id: true, email: true, name: true, characterName: true, portraitId: true, portraitUrl: true, playerClass: true, seatIndex: true, shadowColor: true },
  });

  return NextResponse.json(user, { status: 201 });
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

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { id, password, seatIndex, ...rest } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...rest };

  if (password) {
    data.passwordHash = await hash(password, 12);
  }

  if (seatIndex !== undefined) {
    if (seatIndex === null) {
      data.seatIndex = null;
    } else {
      const seatTaken = await prisma.user.findUnique({ where: { seatIndex } });
      if (seatTaken && seatTaken.id !== id) {
        return NextResponse.json({ error: `Seat ${seatIndex} is already taken` }, { status: 409 });
      }
      data.seatIndex = seatIndex;
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, characterName: true, portraitId: true, portraitUrl: true, playerClass: true, seatIndex: true, shadowColor: true, role: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (existing.role === "DM") {
    return NextResponse.json({ error: "Cannot delete DM account" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
