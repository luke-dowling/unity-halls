"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

const PLAYER_CLASSES = [
  { value: "CLERIC", label: "Cleric" },
  { value: "RANGER", label: "Ranger" },
  { value: "BLOOD_HUNTER", label: "Blood Hunter" },
  { value: "PALADIN", label: "Paladin" },
  { value: "SORCERER", label: "Sorcerer" },
]

interface Player {
  id: string
  email: string
  name: string
  characterName?: string
  portraitId?: string
  portraitUrl?: string
  playerClass?: string
  seatIndex?: number
  shadowColor?: string
  role?: string
}

interface PlayerManagerProps {
  onClose: () => void
}

export default function PlayerManager({ onClose }: PlayerManagerProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleCreated(player: Player) {
    setPlayers((prev) => [...prev, player])
    setShowForm(false)
  }

  function handleUpdated(player: Player) {
    setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)))
    setEditingPlayer(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setPlayers((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const nonDmPlayers = players.filter((p) => p.role !== "DM")
  const takenSeats = nonDmPlayers
    .filter((p) => p.seatIndex != null)
    .map((p) => p.seatIndex as number)

  return (
    <div className='fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4'>
      <div className='bg-stone-900 border border-stone-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-stone-900 border-b border-stone-700 p-4 flex items-center justify-between z-10'>
          <h2 className='text-lg font-serif font-semibold text-amber-400'>
            Manage Players
          </h2>
          <button
            onClick={onClose}
            className='text-stone-400 hover:text-stone-100 transition-colors text-xl'
          >
            &times;
          </button>
        </div>

        <div className='p-4 space-y-4'>
          {loading ? (
            <p className='text-stone-400 text-sm'>Loading…</p>
          ) : showForm ? (
            <PlayerForm
              player={editingPlayer}
              takenSeats={takenSeats.filter(
                (s) => editingPlayer?.seatIndex !== s,
              )}
              onSave={editingPlayer ? handleUpdated : handleCreated}
              onCancel={() => {
                setShowForm(false)
                setEditingPlayer(null)
              }}
            />
          ) : (
            <>
              <button
                onClick={() => {
                  setEditingPlayer(null)
                  setShowForm(true)
                }}
                className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors'
              >
                + Add Player
              </button>

              {nonDmPlayers.length === 0 && (
                <p className='text-stone-500 text-sm text-center'>
                  No players yet.
                </p>
              )}

              {nonDmPlayers.map((player) => (
                <div
                  key={player.id}
                  className='bg-stone-800/50 border border-stone-700 rounded-lg p-3 space-y-2'
                >
                  <div className='flex items-center gap-3'>
                    {player.portraitUrl ? (
                      <Image
                        src={player.portraitUrl}
                        alt={player.characterName ?? player.name}
                        width={40}
                        height={40}
                        className='w-10 h-10 rounded-full object-cover border-2 border-amber-500'
                      />
                    ) : player.portraitId ? (
                      <Image
                        src={`/portraits/${player.portraitId}`}
                        alt={player.characterName ?? player.name}
                        width={40}
                        height={40}
                        className='w-10 h-10 rounded-full object-cover border-2 border-amber-500'
                      />
                    ) : (
                      <div className='w-10 h-10 rounded-full bg-stone-700 border-2 border-stone-600 flex items-center justify-center text-stone-400 text-sm font-serif'>
                        {(player.characterName ??
                          player.name)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-stone-100 truncate'>
                        {player.name}
                      </p>
                      {player.characterName && (
                        <p className='text-xs text-amber-300 font-serif truncate'>
                          {player.characterName}
                        </p>
                      )}
                      <div className='flex gap-1.5 mt-0.5'>
                        {player.playerClass && (
                          <span className='text-[10px] text-stone-400 border border-stone-600 rounded px-1 py-0.5'>
                            {PLAYER_CLASSES.find(
                              (c) => c.value === player.playerClass,
                            )?.label ?? player.playerClass}
                          </span>
                        )}
                        {player.seatIndex != null && (
                          <span className='text-[10px] text-stone-400 border border-stone-600 rounded px-1 py-0.5'>
                            Seat {player.seatIndex}
                          </span>
                        )}
                        {player.shadowColor && (
                          <span className='text-[10px] text-stone-400 border border-stone-600 rounded px-1 py-0.5 flex items-center gap-1'>
                            <span
                              className='inline-block w-2 h-2 rounded-full'
                              style={{ backgroundColor: player.shadowColor }}
                            />
                            {player.shadowColor}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='flex gap-1.5'>
                      <button
                        onClick={() => {
                          setEditingPlayer(player)
                          setShowForm(true)
                        }}
                        className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-amber-300 hover:border-amber-700 transition-colors'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(player.id)}
                        className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-red-400 hover:border-red-700 transition-colors'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Player form (create + edit)                                       */
/* ------------------------------------------------------------------ */

interface PlayerFormProps {
  player: Player | null
  takenSeats: number[]
  onSave: (player: Player) => void
  onCancel: () => void
}

function PlayerForm({ player, takenSeats, onSave, onCancel }: PlayerFormProps) {
  const isEdit = !!player
  const [form, setForm] = useState({
    email: player?.email ?? "",
    name: player?.name ?? "",
    password: "",
    characterName: player?.characterName ?? "",
    playerClass: player?.playerClass ?? "",
    seatIndex: player?.seatIndex?.toString() ?? "",
    shadowColor: player?.shadowColor ?? "#78716c",
  })
  const [portraitPreview, setPortraitPreview] = useState<string>(
    player?.portraitUrl ?? "",
  )
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPortraitFile(file)
    setPortraitPreview(URL.createObjectURL(file))
  }

  async function uploadPortrait(): Promise<string | undefined> {
    if (!portraitFile) return undefined
    const fd = new FormData()
    fd.append("file", portraitFile)
    fd.append("folder", "unity-halls/portraits")
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (!res.ok) throw new Error("Portrait upload failed")
    const data = await res.json()
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const portraitUrl = await uploadPortrait()

      if (isEdit) {
        const body: Record<string, unknown> = { id: player!.id }
        if (form.name && form.name !== player!.name) body.name = form.name
        if (form.password) body.password = form.password
        if (form.characterName !== (player!.characterName ?? ""))
          body.characterName = form.characterName || undefined
        if (form.playerClass !== (player!.playerClass ?? ""))
          body.playerClass = form.playerClass || undefined
        if (form.seatIndex !== (player!.seatIndex?.toString() ?? "")) {
          body.seatIndex = form.seatIndex ? parseInt(form.seatIndex) : null
        }
        if (form.shadowColor !== (player!.shadowColor ?? "#78716c"))
          body.shadowColor = form.shadowColor
        if (portraitUrl) body.portraitUrl = portraitUrl

        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to update player.",
          )
        }
      } else {
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
            shadowColor: form.shadowColor || undefined,
            portraitUrl: portraitUrl || undefined,
          }),
        })

        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to create player.",
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-serif font-semibold text-amber-300'>
          {isEdit ? "Edit Player" : "Add Player"}
        </h3>
        <button
          type='button'
          onClick={onCancel}
          className='text-xs text-stone-400 hover:text-stone-200'
        >
          Cancel
        </button>
      </div>

      {/* Portrait upload */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Portrait
        </label>
        <div className='flex items-center gap-3'>
          {portraitPreview ? (
            <Image
              src={portraitPreview}
              alt='Portrait'
              width={48}
              height={48}
              className='w-12 h-12 rounded-full object-cover border-2 border-amber-500'
            />
          ) : (
            <div className='w-12 h-12 rounded-full bg-stone-700 border-2 border-stone-600 flex items-center justify-center text-stone-400 text-xs'>
              ?
            </div>
          )}
          <label className='cursor-pointer px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors'>
            Choose Image
            <input
              type='file'
              accept='image/*'
              onChange={handlePortraitChange}
              className='hidden'
            />
          </label>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        {/* Email (only on create) */}
        {!isEdit && (
          <div className='space-y-1'>
            <label className='block text-xs uppercase tracking-wider text-stone-400'>
              Email
            </label>
            <input
              type='email'
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder='player@example.com'
              className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
            />
          </div>
        )}

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            Name
          </label>
          <input
            type='text'
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='Alice'
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
          />
        </div>

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            {isEdit ? "New Password (optional)" : "Password"}
          </label>
          <input
            type='password'
            required={!isEdit}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder='min 8 chars'
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
          />
        </div>

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            Character Name
          </label>
          <input
            type='text'
            value={form.characterName}
            onChange={(e) =>
              setForm({ ...form, characterName: e.target.value })
            }
            placeholder='Lyra Stonehaven'
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
          />
        </div>

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            Class
          </label>
          <select
            value={form.playerClass}
            onChange={(e) => setForm({ ...form, playerClass: e.target.value })}
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
          >
            <option value=''>None</option>
            {PLAYER_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            Seat (1-5)
          </label>
          <select
            value={form.seatIndex}
            onChange={(e) => setForm({ ...form, seatIndex: e.target.value })}
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
          >
            <option value=''>None</option>
            {[1, 2, 3, 4, 5].map((i) => (
              <option key={i} value={i} disabled={takenSeats.includes(i)}>
                Seat {i} {takenSeats.includes(i) ? "(taken)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            Shadow Color
          </label>
          <div className='flex items-center gap-2'>
            <input
              type='color'
              value={form.shadowColor}
              onChange={(e) =>
                setForm({ ...form, shadowColor: e.target.value })
              }
              className='w-8 h-8 rounded border border-stone-600 bg-stone-800 cursor-pointer'
            />
            <span className='text-xs text-stone-400 font-mono'>
              {form.shadowColor}
            </span>
          </div>
        </div>
      </div>

      {error && <p className='text-red-400 text-xs'>{error}</p>}

      <button
        type='submit'
        disabled={saving}
        className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50'
      >
        {saving ? "Saving…" : isEdit ? "Update Player" : "Create Player"}
      </button>
    </form>
  )
}
