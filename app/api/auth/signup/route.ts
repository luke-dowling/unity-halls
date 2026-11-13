import { prisma } from "@/actions/prisma"
import { sendVerificationEmail } from "@/actions/mail"
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import { clientIp, rateLimit, tooManyRequests } from "@/actions/rate-limit"

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const signupSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(80),
  password: z.string().min(12),
})

// Each signup sends an email (Resend quota) and creates rows: cap how many accounts one address can create.
const SIGNUPS_PER_IP_PER_HOUR = 5

export async function POST(req: Request) {
  const limited = rateLimit(`signup:ip:${clientIp(req)}`, SIGNUPS_PER_IP_PER_HOUR, 60 * 60 * 1000)
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "Too many sign-ups from your network. Please try again later.")

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

  // Signup no longer creates a Room — every account could otherwise host
  // (and rack up session costs) by default. A Room is only ever created for
  // a DM-flagged account, lazily, the first time they load the dashboard.
  const user = await prisma.user.create({
    data: { email, name, passwordHash, verificationToken, verificationTokenExpiresAt },
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
