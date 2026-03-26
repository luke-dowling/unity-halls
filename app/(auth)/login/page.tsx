"use client"

import { useActionState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

type FormState = { error?: string } | null

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value

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
    <main className='min-h-screen flex items-center justify-center bg-stone-950'>
      <div className='w-full max-w-sm space-y-6 px-6'>
        {/* Header */}
        <div className='text-center space-y-1'>
          <h1 className='text-3xl font-serif font-bold text-amber-400 tracking-wide'>
            Unity Halls
          </h1>
          <p className='text-stone-400 text-sm'>
            Enter your credentials to join the session
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className='bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4 shadow-xl'
        >
          <div className='space-y-1'>
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
              className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              placeholder='you@example.com'
            />
          </div>

          <div className='space-y-1'>
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
              className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
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
            className='w-full rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold py-2 text-sm transition-colors'
          >
            {loading ? "Entering…" : "Enter the Hall"}
          </button>
        </form>
      </div>
    </main>
  )
}
