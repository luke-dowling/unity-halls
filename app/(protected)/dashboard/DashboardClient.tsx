"use client"

import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"

interface RoomSummary {
  roomId: string
  roomName: string
  dmName: string
  status: "ACTIVE" | "PENDING" | "LEFT"
}

interface OwnedRoom {
  id: string
  name: string
  inviteToken: string
  pendingCount: number
}

interface DashboardClientProps {
  sessionName: string
  maxPlayerRooms: number
  ownedRoom: OwnedRoom | null
  active: RoomSummary[]
  pending: RoomSummary[]
  left: RoomSummary[]
}

export default function DashboardClient({
  sessionName,
  maxPlayerRooms,
  ownedRoom,
  active: initialActive,
  pending: initialPending,
  left: initialLeft,
}: DashboardClientProps) {
  const [active, setActive] = useState(initialActive)
  const [pending, setPending] = useState(initialPending)
  const [left, setLeft] = useState(initialLeft)
  const inviteToken = ownedRoom?.inviteToken ?? ""
  const [copied, setCopied] = useState(false)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [rejoiningId, setRejoiningId] = useState<string | null>(null)

  async function handleCopyInvite() {
    if (!inviteToken) return
    const url = `${window.location.origin}/invite/${inviteToken}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave(roomId: string) {
    setLeavingId(roomId)
    const res = await fetch(`/api/rooms/${roomId}/membership`, { method: "DELETE" })
    if (res.ok) {
      const room = active.find((r) => r.roomId === roomId)
      setActive((prev) => prev.filter((r) => r.roomId !== roomId))
      if (room) setLeft((prev) => [{ ...room, status: "LEFT" }, ...prev])
    }
    setLeavingId(null)
  }

  async function handleRejoin(roomId: string) {
    setRejoiningId(roomId)
    const res = await fetch(`/api/rooms/${roomId}/membership`, { method: "POST" })
    if (res.ok) {
      const room = left.find((r) => r.roomId === roomId)
      setLeft((prev) => prev.filter((r) => r.roomId !== roomId))
      if (room) setPending((prev) => [{ ...room, status: "PENDING" }, ...prev])
    }
    setRejoiningId(null)
  }

  return (
    <main className='min-h-screen bg-stone-950 text-stone-100'>
      <header className='border-b border-stone-800/50 bg-stone-950/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between'>
        <span className='font-serif text-amber-400 text-2xl'>Unity Halls</span>
        <div className='flex items-center gap-4 text-sm text-stone-400'>
          <span>{sessionName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className='px-3 py-1.5 text-xs rounded border border-stone-700 hover:border-red-700 text-stone-400 hover:text-red-300 transition-colors'
          >
            Log out
          </button>
        </div>
      </header>

      <div className='max-w-3xl mx-auto px-6 py-10 space-y-10'>
        {/* Your room */}
        {ownedRoom && (
          <section className='space-y-3'>
            <h2 className='text-xs uppercase tracking-wider text-stone-500'>
              Your Room
            </h2>
            <div className='bg-stone-900 border border-amber-800/40 rounded-lg p-5 space-y-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='font-serif text-lg text-amber-300'>{ownedRoom.name}</p>
                  {ownedRoom.pendingCount > 0 && (
                    <p className='text-xs text-amber-400 mt-1'>
                      {ownedRoom.pendingCount} pending join{" "}
                      {ownedRoom.pendingCount === 1 ? "request" : "requests"}
                    </p>
                  )}
                </div>
                <Link
                  href={`/room/${ownedRoom.id}`}
                  className='px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors shrink-0'
                >
                  Enter
                </Link>
              </div>

              <div className='space-y-1.5'>
                <label className='block text-xs uppercase tracking-wider text-stone-500'>
                  Invite Link
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`}
                    className='flex-1 bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-xs text-stone-300 font-mono'
                  />
                  <button
                    onClick={handleCopyInvite}
                    className='px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors shrink-0'
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className='text-xs text-stone-500'>
                  Share this with friends — anyone with the link joins instantly.
                  Manage players and regenerate the link from inside the room.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Active games */}
        <section className='space-y-3'>
          <div className='flex items-baseline justify-between'>
            <h2 className='text-xs uppercase tracking-wider text-stone-500'>
              Games You&apos;re In
            </h2>
            <span className='text-xs text-stone-600'>
              {active.length} / {maxPlayerRooms}
            </span>
          </div>
          {active.length === 0 && pending.length === 0 ? (
            <p className='text-stone-500 text-sm'>
              Not in any games yet — ask a friend for their invite link.
            </p>
          ) : (
            <div className='space-y-2'>
              {active.map((room) => (
                <div
                  key={room.roomId}
                  className='bg-stone-900 border border-stone-700 rounded-lg p-4 flex items-center justify-between gap-3'
                >
                  <div className='min-w-0'>
                    <p className='font-medium text-stone-100 truncate'>{room.roomName}</p>
                    <p className='text-xs text-stone-500'>DM: {room.dmName}</p>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <Link
                      href={`/room/${room.roomId}`}
                      className='px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors'
                    >
                      Enter
                    </Link>
                    <button
                      onClick={() => handleLeave(room.roomId)}
                      disabled={leavingId === room.roomId}
                      className='px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:text-red-400 hover:border-red-700 transition-colors disabled:opacity-50'
                    >
                      {leavingId === room.roomId ? "…" : "Leave"}
                    </button>
                  </div>
                </div>
              ))}
              {pending.map((room) => (
                <div
                  key={room.roomId}
                  className='bg-stone-900/60 border border-stone-800 rounded-lg p-4 flex items-center justify-between gap-3'
                >
                  <div className='min-w-0'>
                    <p className='font-medium text-stone-300 truncate'>{room.roomName}</p>
                    <p className='text-xs text-stone-500'>DM: {room.dmName}</p>
                  </div>
                  <span className='text-xs text-amber-400 shrink-0'>
                    Request pending…
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past games */}
        {left.length > 0 && (
          <section className='space-y-3'>
            <h2 className='text-xs uppercase tracking-wider text-stone-500'>
              Past Games
            </h2>
            <div className='space-y-2'>
              {left.map((room) => (
                <div
                  key={room.roomId}
                  className='bg-stone-900/50 border border-stone-800 rounded-lg p-4 flex items-center justify-between gap-3'
                >
                  <div className='min-w-0'>
                    <p className='font-medium text-stone-400 truncate'>{room.roomName}</p>
                    <p className='text-xs text-stone-600'>DM: {room.dmName}</p>
                  </div>
                  <button
                    onClick={() => handleRejoin(room.roomId)}
                    disabled={rejoiningId === room.roomId}
                    className='px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors shrink-0 disabled:opacity-50'
                  >
                    {rejoiningId === room.roomId ? "…" : "Request to Rejoin"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
