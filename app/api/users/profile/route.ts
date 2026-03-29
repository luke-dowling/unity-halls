import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  characterName: z.string().min(1).max(80).optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  portraitUrl: z.string().url().or(z.literal("")).optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.characterName !== undefined) data.characterName = parsed.data.characterName;
  if (parsed.data.shadowColor !== undefined) data.shadowColor = parsed.data.shadowColor;
  if (parsed.data.portraitUrl !== undefined) data.portraitUrl = parsed.data.portraitUrl || null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, characterName: true, shadowColor: true, portraitUrl: true },
  });

  return NextResponse.json(user);
}
