"use client"

import { useState } from "react"

const PLAYER_CLASSES = [
  { value: "CLERIC", label: "Cleric" },
  { value: "RANGER", label: "Ranger" },
  { value: "BLOOD_HUNTER", label: "Blood Hunter" },
  { value: "PALADIN", label: "Paladin" },
  { value: "SORCERER", label: "Sorcerer" },
]

interface UserFormProps {
  takenSeats: number[]
  onCreated: (user: {
    id: string
    email: string
    name: string
    characterName?: string
    portraitId?: string
    playerClass?: string
    seatIndex?: number
  }) => void
}

export default function UserForm({ takenSeats, onCreated }: UserFormProps) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    characterName: "",
    playerClass: "",
    seatIndex: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        name: form.name,
        password: form.password,
        characterName: form.characterName || undefined,
        playerClass: form.playerClass || undefined,
        seatIndex: form.seatIndex ? parseInt(form.seatIndex) : undefined,
      }),
    })

    if (res.ok) {
      const user = await res.json()
      onCreated(user)
      setForm({
        email: "",
        name: "",
        password: "",
        characterName: "",
        playerClass: "",
        seatIndex: "",
      })
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed to create user.")
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className='grid grid-cols-2 gap-3'>
      {[
        {
          id: "email",
          label: "Email",
          type: "email",
          placeholder: "player@example.com",
          key: "email" as const,
        },
        {
          id: "name",
          label: "Real Name",
          type: "text",
          placeholder: "Alice",
          key: "name" as const,
        },
        {
          id: "password",
          label: "Password",
          type: "password",
          placeholder: "min 8 chars",
          key: "password" as const,
        },
        {
          id: "characterName",
          label: "Character Name",
          type: "text",
          placeholder: "Lyra Stonehaven",
          key: "characterName" as const,
        },
      ].map(({ id, label, type, placeholder, key }) => (
        <div key={id} className='space-y-1'>
          <label
            htmlFor={id}
            className='block text-xs uppercase tracking-wider text-stone-400'
          >
            {label}
          </label>
          <input
            id={id}
            type={type}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            required={key !== "characterName"}
            className='w-full rounded bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
          />
        </div>
      ))}

      {/* Player class */}
      <div className='space-y-1'>
        <label
          htmlFor='playerClass'
          className='block text-xs uppercase tracking-wider text-stone-400'
        >
          Class
        </label>
        <select
          id='playerClass'
          value={form.playerClass}
          onChange={(e) =>
            setForm((f) => ({ ...f, playerClass: e.target.value }))
          }
          className='w-full rounded bg-stone-800 border border-stone-600 text-stone-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
        >
          <option value=''>Select class…</option>
          {PLAYER_CLASSES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Seat index */}
      <div className='space-y-1'>
        <label
          htmlFor='seatIndex'
          className='block text-xs uppercase tracking-wider text-stone-400'
        >
          Seat
        </label>
        <select
          id='seatIndex'
          value={form.seatIndex}
          onChange={(e) =>
            setForm((f) => ({ ...f, seatIndex: e.target.value }))
          }
          className='w-full rounded bg-stone-800 border border-stone-600 text-stone-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
        >
          <option value=''>Select seat…</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n} disabled={takenSeats.includes(n)}>
              Seat {n}
              {takenSeats.includes(n) ? " (taken)" : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className='col-span-2 text-red-400 text-sm' role='alert'>
          {error}
        </p>
      )}

      <button
        type='submit'
        disabled={saving}
        className='col-span-2 rounded bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold py-1.5 text-sm transition-colors'
      >
        {saving ? "Creating…" : "Create Player Account"}
      </button>
    </form>
  )
}
