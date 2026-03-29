"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import UserForm from "@/components/UserForm"
import PortraitPicker from "@/components/PortraitPicker"
import Image from "next/image"
import Link from "next/link"

const CLASS_LABELS: Record<string, string> = {
  CLERIC: "Cleric",
  RANGER: "Ranger",
  BLOOD_HUNTER: "Blood Hunter",
  PALADIN: "Paladin",
  SORCERER: "Sorcerer",
}

interface Player {
  id: string
  email: string
  name: string
  characterName?: string
  portraitId?: string
  playerClass?: string
  seatIndex?: number
  shadowColor?: string
  role?: string
}

export default function AdminClient() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/users")
      .then(async (res) => {
        if (res.status === 403) {
          router.replace("/room")
          return
        }
        const data = await res.json()
        setPlayers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  function handleCreated(user: Player) {
    setPlayers((prev) => [...prev, user])
  }

  function handlePortraitAssigned(userId: string, portraitId: string) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, portraitId } : p)),
    )
  }

  const takenSeats = players
    .filter((p) => p.seatIndex != null)
    .map((p) => p.seatIndex as number)

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64 text-stone-400'>
        Loading…
      </div>
    )
  }

  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 p-6 space-y-8'>
      <header className='flex items-center justify-between'>
        <h1 className='text-2xl font-serif font-bold text-amber-400'>
          DM Admin — Unity Halls
        </h1>
        <Link
          href='/room'
          className='text-sm text-stone-400 hover:text-amber-400 transition-colors'
        >
          ← Back to room
        </Link>
      </header>

      {/* Create player */}
      <section className='bg-stone-900 border border-stone-700 rounded-lg p-5 space-y-3 max-w-xl'>
        <h2 className='text-base font-serif font-semibold text-amber-300'>
          Create Player Account
        </h2>
        <UserForm takenSeats={takenSeats} onCreated={handleCreated} />
      </section>

      {/* Player roster */}
      <section className='space-y-4 max-w-2xl'>
        <h2 className='text-base font-serif font-semibold text-amber-300'>
          Player Roster
        </h2>
        {players.filter((p) => p.role !== "DM").length === 0 && (
          <p className='text-stone-500 text-sm'>
            No players yet. Create one above.
          </p>
        )}
        {players
          .filter((p) => p.role !== "DM")
          .map((player) => (
            <div
              key={player.id}
              className='bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3'
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <p className='font-medium text-stone-100'>{player.name}</p>
                  <p className='text-xs text-stone-400'>{player.email}</p>
                  {player.characterName && (
                    <p className='text-sm text-amber-300 mt-0.5 font-serif'>
                      {player.characterName}
                    </p>
                  )}
                  <div className='flex gap-2 mt-1'>
                    {player.playerClass && (
                      <span className='text-xs text-stone-400 border border-stone-600 rounded px-1.5 py-0.5'>
                        {CLASS_LABELS[player.playerClass] ?? player.playerClass}
                      </span>
                    )}
                    {player.seatIndex != null && (
                      <span className='text-xs text-stone-400 border border-stone-600 rounded px-1.5 py-0.5'>
                        Seat {player.seatIndex}
                      </span>
                    )}
                  </div>
                </div>
                {player.portraitId && (
                  <Image
                    src={`/portraits/${player.portraitId}`}
                    alt={player.characterName ?? player.name}
                    width={48}
                    height={48}
                    className='w-12 h-12 rounded-full object-cover border-2 border-amber-500'
                  />
                )}
              </div>
              <div>
                <p className='text-xs text-stone-500 uppercase tracking-wider mb-1'>
                  Assign Portrait
                </p>
                <PortraitPicker
                  userId={player.id}
                  currentPortraitId={player.portraitId}
                  onAssigned={handlePortraitAssigned}
                />
              </div>
            </div>
          ))}
      </section>
    </main>
  )
}
