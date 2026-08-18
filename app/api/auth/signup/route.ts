import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"

const signupSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { email, name, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const passwordHash = await hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, name, passwordHash },
    })
    await tx.room.create({
      data: { name: `${name}'s Game`, ownerId: created.id },
    })
    return created
  })

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
}
