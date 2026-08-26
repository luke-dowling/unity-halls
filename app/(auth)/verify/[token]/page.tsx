import { prisma } from "@/actions/prisma"
import Link from "next/link"

function VerifyMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6 px-6 text-center'>
      <h1 className='font-serif text-2xl text-amber-400'>{title}</h1>
      <p className='text-stone-400 text-sm max-w-sm'>{body}</p>
      <Link
        href='/login'
        className='px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors'
      >
        Go to Login
      </Link>
    </main>
  )
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const user = await prisma.user.findUnique({ where: { verificationToken: token } })

  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    return (
      <VerifyMessage
        title='Link expired'
        body='This verification link is invalid or has expired. Try logging in and requesting a new one.'
      />
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  })

  return (
    <VerifyMessage
      title='Email verified'
      body='Your email address has been confirmed. You can now log in.'
    />
  )
}
