import { prisma } from "@/actions/prisma"
import { sendVerificationEmail } from "@/actions/mail"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { z } from "zod"

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const resendSchema = z.object({
  email: z.email(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = resendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { email } = parsed.data
  const genericResponse = NextResponse.json({
    message: "If an account with that email exists and isn't verified yet, we've sent a new link.",
  })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.emailVerified) return genericResponse

  const verificationToken = randomBytes(32).toString("hex")
  const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken, verificationTokenExpiresAt },
  })

  const verifyUrl = `${new URL(req.url).origin}/verify/${verificationToken}`
  await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })

  return genericResponse
}
