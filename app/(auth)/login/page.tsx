"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password.")
      setLoading(false)
    } else {
      router.push("/room")
    }
  }

  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col'>
      {/* Header — matches homepage hero */}
      <header className='relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-14 overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-amber-900/20 blur-3xl' />
          <div className='absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent' />
          <div className='absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent' />
        </div>

        <div className='relative mb-5 w-16 h-16 rounded-full border-2 border-amber-600/60 bg-stone-900 flex items-center justify-center shadow-lg shadow-amber-900/30'>
          <svg
            viewBox='0 0 40 40'
            className='w-9 h-9 text-amber-500'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <polygon points='20,4 36,14 36,26 20,36 4,26 4,14' />
            <polygon points='20,10 29,15 29,25 20,30 11,25 11,15' opacity='0.5' />
            <line x1='20' y1='4' x2='20' y2='10' />
            <line x1='36' y1='14' x2='29' y2='15' />
            <line x1='36' y1='26' x2='29' y2='25' />
            <line x1='20' y1='36' x2='20' y2='30' />
            <line x1='4' y1='26' x2='11' y2='25' />
            <line x1='4' y1='14' x2='11' y2='15' />
          </svg>
        </div>

        <h1 className='relative font-serif text-5xl sm:text-6xl font-bold text-amber-400 tracking-wide drop-shadow-lg'>
          Unity Halls
        </h1>
      </header>

      {/* Login form */}
      <div className='flex-1 flex items-center justify-center px-6 py-12'>
        <div className='w-full max-w-md space-y-2'>
          <p className='text-stone-400 text-sm text-center mb-6'>
            Enter your credentials to join the session
          </p>

          <form
            onSubmit={handleSubmit}
            className='bg-stone-900 border border-stone-700 rounded-lg p-8 space-y-6 shadow-xl'
          >
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

            {error && (
              <p className='text-red-400 text-sm' role='alert'>
                {error}
              </p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold py-3 text-base transition-colors'
            >
              {loading ? "Entering…" : "Enter the Hall"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
