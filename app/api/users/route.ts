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
    select: { id: true, email: true, name: true, characterName: true, portraitId: true, playerClass: true, seatIndex: true, role: true },
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

  const { email, name, password, characterName, playerClass, seatIndex } = parsed.data;

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
    data: { email, name, passwordHash, characterName, playerClass, seatIndex },
    select: { id: true, email: true, name: true, characterName: true, portraitId: true, playerClass: true, seatIndex: true },
  });

  return NextResponse.json(user, { status: 201 });
}
