"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

const CLASS_LABELS: Record<string, string> = {
  CLERIC: "Cleric",
  RANGER: "Ranger",
  BLOOD_HUNTER: "Blood Hunter",
  PALADIN: "Paladin",
  SORCERER: "Sorcerer",
}

interface Membership {
  id: string
  status: "ACTIVE" | "PENDING"
  seatIndex?: number
  characterName?: string
  playerClass?: string
  portraitUrl?: string
  shadowColor?: string
  user: { id: string; name: string; email: string }
}

interface RoomMembersPanelProps {
  roomId: string
  inviteToken?: string
  onClose: () => void
}

export default function RoomMembersPanel({
  roomId,
  inviteToken,
  onClose,
}: RoomMembersPanelProps) {
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(inviteToken ?? "")
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetch(`/api/rooms/${roomId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [roomId])

  async function handleAction(membershipId: string, action: "approve" | "deny" | "kick") {
    const res = await fetch(`/api/rooms/${roomId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, action }),
    })
    if (!res.ok) return
    if (action === "kick" || action === "deny") {
      setMembers((prev) => prev.filter((m) => m.id !== membershipId))
    } else {
      const updated = await res.json()
      setMembers((prev) => prev.map((m) => (m.id === membershipId ? { ...m, ...updated } : m)))
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    const res = await fetch(`/api/rooms/${roomId}/invite`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setToken(data.inviteToken)
    }
    setRegenerating(false)
  }

  async function handleCopy() {
    if (!token) return
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const active = members.filter((m) => m.status === "ACTIVE")
  const pending = members.filter((m) => m.status === "PENDING")

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

        <div className='p-4 space-y-6'>
          {/* Invite link */}
          <div className='space-y-2'>
            <label className='block text-xs uppercase tracking-wider text-stone-400'>
              Invite Link
            </label>
            <div className='flex items-center gap-2'>
              <input
                readOnly
                value={token ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}` : ""}
                className='flex-1 bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-xs text-stone-300 font-mono'
              />
              <button
                onClick={handleCopy}
                className='px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors shrink-0'
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className='px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-red-700 hover:text-red-300 transition-colors shrink-0 disabled:opacity-50'
              >
                {regenerating ? "…" : "Regenerate"}
              </button>
            </div>
            <p className='text-xs text-stone-500'>
              Anyone with this link can join instantly. Regenerating invalidates the old link.
            </p>
          </div>

          {/* Pending requests */}
          {pending.length > 0 && (
            <div className='space-y-2'>
              <label className='block text-xs uppercase tracking-wider text-stone-400'>
                Pending Rejoin Requests
              </label>
              {pending.map((m) => (
                <div
                  key={m.id}
                  className='bg-amber-900/20 border border-amber-800/50 rounded-lg p-3 flex items-center justify-between gap-3'
                >
                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-stone-100 truncate'>
                      {m.characterName || m.user.name}
                    </p>
                    <p className='text-xs text-stone-400 truncate'>{m.user.email}</p>
                  </div>
                  <div className='flex gap-1.5 shrink-0'>
                    <button
                      onClick={() => handleAction(m.id, "approve")}
                      className='px-2 py-1 text-xs rounded border border-amber-700 bg-amber-900/40 text-amber-300 hover:bg-amber-800/50 transition-colors'
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(m.id, "deny")}
                      className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-red-400 hover:border-red-700 transition-colors'
                    >
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active members */}
          <div className='space-y-2'>
            <label className='block text-xs uppercase tracking-wider text-stone-400'>
              Active Players
            </label>
            {loading ? (
              <p className='text-stone-400 text-sm'>Loading…</p>
            ) : active.length === 0 ? (
              <p className='text-stone-500 text-sm text-center py-2'>
                No players yet — share the invite link above.
              </p>
            ) : (
              active.map((player) => (
                <div
                  key={player.id}
                  className='bg-stone-800/50 border border-stone-700 rounded-lg p-3 space-y-2'
                >
                  <div className='flex items-center gap-3'>
                    {player.portraitUrl ? (
                      <Image
                        src={player.portraitUrl}
                        alt={player.characterName ?? player.user.name}
                        width={40}
                        height={40}
                        className='w-10 h-10 rounded-full object-cover border-2 border-amber-500'
                      />
                    ) : (
                      <div className='w-10 h-10 rounded-full bg-stone-700 border-2 border-stone-600 flex items-center justify-center text-stone-400 text-sm font-serif'>
                        {(player.characterName ?? player.user.name)?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-stone-100 truncate'>
                        {player.user.name}
                      </p>
                      {player.characterName && (
                        <p className='text-xs text-amber-300 font-serif truncate'>
                          {player.characterName}
                        </p>
                      )}
                      <div className='flex gap-1.5 mt-0.5'>
                        {player.playerClass && (
                          <span className='text-[10px] text-stone-400 border border-stone-600 rounded px-1 py-0.5'>
                            {CLASS_LABELS[player.playerClass] ?? player.playerClass}
                          </span>
                        )}
                        {player.seatIndex != null && (
                          <span className='text-[10px] text-stone-400 border border-stone-600 rounded px-1 py-0.5'>
                            Seat {player.seatIndex}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAction(player.id, "kick")}
                      className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-red-400 hover:border-red-700 transition-colors shrink-0'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
