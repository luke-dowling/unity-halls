"use client"

import { signIn } from "next-auth/react"
import { useActionState } from "react"
import { SubmitButton } from "./SubmitButton"
import { z } from "zod"

const schema = z
  .object({
    name: z.string().trim().min(1, { error: "Name is required" }).max(40),
    email: z.email({
      error: "Invalid Email",
    }),
    password: z.string().min(12, {
      error: "Must be at least 12 characters",
    }),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    error: "Passwords do not match",
    path: ["passwordConfirm"],
  })

interface FormState {
  message: null | string
  status: null | "success"
}

const initialState: FormState = {
  message: null,
  status: null,
}

export const SignUpForm = () => {
  const signUpAction = async (
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const parsed = schema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      passwordConfirm: formData.get("passwordConfirm"),
    })

    if (!parsed.success) {
      return { message: parsed.error.issues[0]?.message ?? "Invalid input", status: null }
    }

    const { name, email, password } = parsed.data

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      if (res.status === 409) {
        return { message: "An account with that email already exists.", status: null }
      }
      return { message: "Something went wrong. Please try again.", status: null }
    }

    return {
      message: "Account created! Check your email for a link to verify your address before logging in.",
      status: "success",
    }
  }

  const [formState, formAction, pending] = useActionState(
    signUpAction,
    initialState,
  )

  if (formState.status === "success") {
    return (
      <div className='bg-stone-900 border border-stone-700 rounded-lg p-8 space-y-4 shadow-xl text-center'>
        <p className='text-amber-400 font-medium'>{formState.message}</p>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className='bg-stone-900 border border-stone-700 rounded-lg p-8 space-y-6 shadow-xl'
    >
      <button
        type='button'
        disabled={pending}
        onClick={() => signIn("google")}
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
          htmlFor='name'
          className='block text-xs font-medium text-stone-300 uppercase tracking-wider'
        >
          Name
        </label>
        <input
          id='name'
          name='name'
          type='text'
          required
          autoComplete='name'
          className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
          placeholder='Your name'
        />
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
          minLength={12}
          autoComplete='new-password'
          className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
          placeholder='At least 12 characters'
        />
      </div>

      <div className='space-y-2'>
        <label
          htmlFor='password-confirm'
          className='block text-xs font-medium text-stone-300 uppercase tracking-wider'
        >
          Password Confirm
        </label>
        <input
          id='password-confirm'
          name='passwordConfirm'
          type='password'
          required
          minLength={12}
          autoComplete='new-password'
          className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
          placeholder='At least 12 characters'
        />
      </div>
      <p aria-live='polite'>{formState?.message}</p>

      <SubmitButton
        pending={pending}
        label='Create Account'
        pendingLabel='Creating account…'
      />
    </form>
  )
}
