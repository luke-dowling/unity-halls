import { prisma } from "@/actions/prisma"
import { sendVerificationEmail } from "@/actions/mail"
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { randomBytes } from "node:crypto"
import { z } from "zod"

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const signupSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(80),
  password: z.string().min(12),
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
  const verificationToken = randomBytes(32).toString("hex")
  const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, name, passwordHash, verificationToken, verificationTokenExpiresAt },
    })
    await tx.room.create({
      data: { name: `${name}'s Game`, ownerId: created.id },
    })
    return created
  })

  const verifyUrl = `${new URL(req.url).origin}/verify/${verificationToken}`
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })
  } catch (err) {
    // The account is already created — don't fail the request over a flaky
    // send. The user can retry from the "resend verification email" flow.
    console.error("Failed to send verification email:", err)
  }

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
}
