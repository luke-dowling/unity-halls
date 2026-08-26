"use client"

import { signIn } from "next-auth/react"
import { useActionState, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { SubmitButton } from "./SubmitButton"
import { z } from "zod"

const schema = z.object({
  email: z.email({
    error: "Invalid Email",
  }),
  password: z.string().min(1, { error: "Password is required" }),
})

interface FormState {
  message: null | string
  unverifiedEmail: null | string
}

const initialState: FormState = {
  message: null,
  unverifiedEmail: null,
}

export const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle")

  const loginAction = async (
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const parsed = schema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })

    if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? "Invalid input", unverifiedEmail: null }
    }

    const { email, password } = parsed.data

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      if (result.code === "email_not_verified") {
        return {
          message: "Please verify your email before logging in.",
          unverifiedEmail: email,
        }
      }
      return { message: "Invalid email or password.", unverifiedEmail: null }
    }

    router.push(callbackUrl)
    return initialState
  }

  const [formState, formAction, pending] = useActionState(
    loginAction,
    initialState,
  )

  const resendVerification = async () => {
    if (!formState.unverifiedEmail) return
    setResendState("sending")
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: formState.unverifiedEmail }),
    })
    setResendState("sent")
  }

  return (
    <div className='w-full max-w-md space-y-2'>
      <p className='text-stone-400 text-sm text-center mb-6'>
        Enter your credentials to join the session
      </p>

      <form
        action={formAction}
        className='bg-stone-900 border border-stone-700 rounded-lg p-8 space-y-6 shadow-xl'
      >
        <button
          type='button'
          onClick={() => signIn("google", { callbackUrl })}
          className='w-full flex items-center justify-center gap-3 rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 font-medium py-3 text-base transition-colors'
        >
          <svg viewBox='0 0 24 24' className='w-5 h-5' aria-hidden='true'>
            <path
              fill='#4285F4'
              d='M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z'
            />
            <path
              fill='#34A853'
              d='M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z'
            />
            <path
              fill='#FBBC05'
              d='M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.998 11.998 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z'
            />
            <path
              fill='#EA4335'
              d='M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z'
            />
          </svg>
          Continue with Google
        </button>

        <div className='flex items-center gap-3'>
          <div className='h-px flex-1 bg-stone-700' />
          <span className='text-xs text-stone-500 uppercase tracking-wider'>
            or
          </span>
          <div className='h-px flex-1 bg-stone-700' />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='email'
            className='block text-xs font-medium text-stone-300 uppercase tracking-wider'
          >
            Email
          </label>
          <input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='email'
            className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
            placeholder='you@example.com'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='password'
            className='block text-xs font-medium text-stone-300 uppercase tracking-wider'
          >
            Password
          </label>
          <input
            id='password'
            name='password'
            type='password'
            required
            autoComplete='current-password'
            className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
            placeholder='••••••••'
          />
        </div>

        <p aria-live='polite' className='text-red-400 text-sm'>
          {formState?.message}
        </p>

        {formState.unverifiedEmail && (
          <button
            type='button'
            disabled={resendState !== "idle"}
            onClick={resendVerification}
            className='w-full text-sm text-amber-400 hover:text-amber-300 disabled:opacity-60'
          >
            {resendState === "sent"
              ? "Verification email sent — check your inbox"
              : resendState === "sending"
                ? "Sending…"
                : "Resend verification email"}
          </button>
        )}

        <SubmitButton
          pending={pending}
          label='Enter the Hall'
          pendingLabel='Entering…'
        />

        <p className='text-center text-sm text-stone-400'>
          New here?{" "}
          <Link href='/signup' className='text-amber-400 hover:text-amber-300'>
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
