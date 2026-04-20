import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const postSchema = z.object({
  content: z.string().min(1).max(500),
  characterName: z.string().max(80).optional(),
  shadowColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const messages = await prisma.chatMessage.findMany({
    select: { id: true, characterName: true, shadowColor: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(messages)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { content, characterName, shadowColor } = parsed.data

  const message = await prisma.chatMessage.create({
    data: {
      userId: session.user.id,
      content,
      characterName: characterName ?? session.user.characterName ?? null,
      shadowColor: shadowColor ?? session.user.shadowColor ?? null,
    },
    select: { id: true, characterName: true, shadowColor: true, content: true, createdAt: true },
  })

  return NextResponse.json(message, { status: 201 })
}
