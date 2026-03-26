"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface Portrait {
  id: string
  url: string
}

interface PortraitPickerProps {
  userId: string
  currentPortraitId?: string
  onAssigned: (userId: string, portraitId: string) => void
}

export default function PortraitPicker({
  userId,
  currentPortraitId,
  onAssigned,
}: PortraitPickerProps) {
  const [portraits, setPortraits] = useState<Portrait[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/portraits")
      .then((r) => r.json())
      .then(setPortraits)
      .catch(console.error)
  }, [])

  async function handleSelect(portraitId: string) {
    setSaving(true)
    const res = await fetch(`/api/users/${userId}/portrait`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portraitId }),
    })
    if (res.ok) {
      onAssigned(userId, portraitId)
    }
    setSaving(false)
  }

  if (portraits.length === 0) {
    return (
      <p className='text-stone-500 text-xs italic'>
        No portraits found. Drop image files into{" "}
        <code className='text-stone-400'>public/portraits/</code>.
      </p>
    )
  }

  return (
    <div className='flex flex-wrap gap-2 mt-2'>
      {portraits.map((p) => (
        <button
          key={p.id}
          type='button'
          onClick={() => handleSelect(p.id)}
          disabled={saving}
          className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-colors ${
            p.id === currentPortraitId
              ? "border-amber-500"
              : "border-stone-600 hover:border-amber-700"
          }`}
          title={p.id}
        >
          <Image src={p.url} alt={p.id} fill className='object-cover' />
        </button>
      ))}
    </div>
  )
}
