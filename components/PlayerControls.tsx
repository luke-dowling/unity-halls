"use client"

import { useState } from "react"
import Image from "next/image"

interface PlayerControlsProps {
  name: string
  characterName: string
  shadowColor: string
  portraitUrl: string
  onProfileUpdated: (profile: {
    name: string
    characterName: string
    shadowColor: string
    portraitUrl: string
  }) => void
}

export default function PlayerControls({
  name: initialName,
  characterName: initialCharacterName,
  shadowColor: initialShadowColor,
  portraitUrl: initialPortraitUrl,
  onProfileUpdated,
}: PlayerControlsProps) {
  const [name, setName] = useState(initialName)
  const [characterName, setCharacterName] = useState(initialCharacterName)
  const [shadowColor, setShadowColor] = useState(initialShadowColor)
  const [portraitUrl, setPortraitUrl] = useState(initialPortraitUrl)
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [portraitPreview, setPortraitPreview] = useState(initialPortraitUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPortraitFile(file)
    setPortraitPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      let finalPortraitUrl = portraitUrl

      if (portraitFile) {
        const fd = new FormData()
        fd.append("file", portraitFile)
        fd.append("folder", "unity-halls/portraits")
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        })
        if (!uploadRes.ok) throw new Error("Portrait upload failed")
        const uploadData = await uploadRes.json()
        finalPortraitUrl = uploadData.url as string
      }

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          characterName,
          shadowColor,
          portraitUrl: finalPortraitUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(
          typeof data.error === "string" ? data.error : "Update failed",
        )
      }

      setPortraitUrl(finalPortraitUrl)
      setPortraitFile(null)
      onProfileUpdated({
        name,
        characterName,
        shadowColor,
        portraitUrl: finalPortraitUrl,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }

    setSaving(false)
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-amber-400 font-serif text-base font-semibold'>
        My Character
      </h2>

      {/* Portrait */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Portrait
        </label>
        <div className='flex items-center gap-3'>
          {portraitPreview ? (
            <Image
              src={portraitPreview}
              alt='Portrait'
              width={56}
              height={56}
              className='w-14 h-14 rounded-full object-cover border-2 border-amber-500'
            />
          ) : (
            <div className='w-14 h-14 rounded-full bg-stone-700 border-2 border-stone-600 flex items-center justify-center text-stone-400 text-lg font-serif'>
              {(characterName || name)?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <label className='cursor-pointer px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors'>
            Change
            <input
              type='file'
              accept='image/*'
              onChange={handlePortraitChange}
              className='hidden'
            />
          </label>
        </div>
      </div>

      {/* Name */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Name
        </label>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>

      {/* Character Name */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Character Name
        </label>
        <input
          type='text'
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>

      {/* Shadow Color */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Shadow Color
        </label>
        <div className='flex items-center gap-3'>
          <input
            type='color'
            value={shadowColor}
            onChange={(e) => setShadowColor(e.target.value)}
            className='w-10 h-8 rounded border border-stone-600 bg-stone-800 cursor-pointer'
          />
          <span className='text-xs text-stone-400 font-mono'>
            {shadowColor}
          </span>
          <div
            className='w-8 h-8 rounded-lg border border-stone-600'
            style={{
              boxShadow: `0 0 12px 3px ${shadowColor}99`,
              backgroundColor: "#1c1917",
            }}
          />
        </div>
      </div>

      {error && <p className='text-red-400 text-xs'>{error}</p>}

      <button
        type='button'
        onClick={handleSave}
        disabled={saving}
        className='w-full px-3 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50'
      >
        {saving ? "Saving…" : "Update Profile"}
      </button>

      {saved && (
        <p className='text-xs text-amber-400 text-center'>✓ Profile updated!</p>
      )}
    </div>
  )
}
