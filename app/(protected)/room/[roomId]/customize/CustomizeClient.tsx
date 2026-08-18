"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface CustomizeClientProps {
  roomId: string
  characterName: string
  portraitUrl: string
  shadowColor: string
}

export default function CustomizeClient({
  roomId,
  characterName: initialCharacterName,
  portraitUrl: initialPortraitUrl,
  shadowColor: initialShadowColor,
}: CustomizeClientProps) {
  const router = useRouter()
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

      const res = await fetch(`/api/rooms/${roomId}/membership`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }

    setSaving(false)
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
            Customize your character before entering
          </p>
        </div>

        {/* Profile Card */}
        <div className='bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4 shadow-xl'>
          {/* Portrait */}
          <div className='space-y-1'>
            <label className='block text-xs font-medium text-stone-300 uppercase tracking-wider'>
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
                  {characterName?.[0]?.toUpperCase() ?? "?"}
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

          {/* Character Name */}
          <div className='space-y-1'>
            <label
              htmlFor='profile-character'
              className='block text-xs font-medium text-stone-300 uppercase tracking-wider'
            >
              Character Name
            </label>
            <input
              id='profile-character'
              type='text'
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className='w-full rounded-md bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
              placeholder='Character name'
            />
          </div>

          {/* Shadow Color */}
          <div className='space-y-1'>
            <label className='block text-xs font-medium text-stone-300 uppercase tracking-wider'>
              Theme Color
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

          {error && (
            <p className='text-red-400 text-sm' role='alert'>
              {error}
            </p>
          )}

          {saved && (
            <p className='text-xs text-amber-400 text-center'>
              ✓ Profile updated!
            </p>
          )}

          {/* Save Profile */}
          <button
            type='button'
            onClick={handleSave}
            disabled={saving}
            className='w-full rounded-md border border-stone-600 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-300 font-medium py-2 text-sm transition-colors'
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          {/* Back to Room */}
          <button
            type='button'
            onClick={() => router.push(`/room/${roomId}`)}
            className='w-full rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold py-2 text-sm transition-colors'
          >
            Back to Session
          </button>
        </div>
      </div>
    </main>
  )
}
