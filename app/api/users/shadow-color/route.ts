import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { shadowColor: parsed.data.shadowColor },
  });

  return NextResponse.json({ shadowColor: parsed.data.shadowColor });
}
