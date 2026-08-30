import { prisma } from "@/actions/prisma"
import { sendVerificationEmail } from "@/actions/mail"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { z } from "zod"

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

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

  // Throttle re-sends per account without changing the response shape (so the
  // response still can't be used to probe which emails are registered) —
  // derive when the last token was issued from its expiry rather than adding
  // a dedicated column. The check-and-set happens in one conditional update
  // so concurrent requests can't both pass the cooldown gate.
  const cooldownCutoff = new Date(Date.now() - (VERIFICATION_TOKEN_TTL_MS - RESEND_COOLDOWN_MS))
  const { count } = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ verificationTokenExpiresAt: null }, { verificationTokenExpiresAt: { lte: cooldownCutoff } }],
    },
    data: { verificationToken, verificationTokenExpiresAt },
  })
  if (count === 0) return genericResponse

  const verifyUrl = `${new URL(req.url).origin}/verify/${verificationToken}`
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })
  } catch (err) {
    console.error("Failed to send verification email:", err)
  }

  return genericResponse
}
