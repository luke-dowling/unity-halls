"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface Background {
  id: string
  name: string
  backgroundUrl: string
}

interface ThemeManagerProps {
  onClose: () => void
  onBackgroundsChanged: (backgrounds: Background[]) => void
}

export default function ThemeManager({
  onClose,
  onBackgroundsChanged,
}: ThemeManagerProps) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBackground, setEditingBackground] = useState<Background | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((data) => {
        setBackgrounds(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleCreated(bg: Background) {
    const next = [...backgrounds, bg].sort((a, b) => a.name.localeCompare(b.name))
    setBackgrounds(next)
    onBackgroundsChanged(next)
    setShowForm(false)
  }

  function handleUpdated(bg: Background) {
    const next = backgrounds
      .map((b) => (b.id === bg.id ? bg : b))
      .sort((a, b) => a.name.localeCompare(b.name))
    setBackgrounds(next)
    onBackgroundsChanged(next)
    setEditingBackground(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/themes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (res.ok) {
      const next = backgrounds.filter((b) => b.id !== id)
      setBackgrounds(next)
      onBackgroundsChanged(next)
    }
  }

  return (
    <div className='fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4'>
      <div className='bg-stone-900 border border-stone-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-stone-900 border-b border-stone-700 p-4 flex items-center justify-between z-10'>
          <h2 className='text-lg font-serif font-semibold text-amber-400'>
            Manage Backgrounds
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
            <BackgroundForm
              background={editingBackground}
              existingIds={backgrounds.map((b) => b.id)}
              onSave={editingBackground ? handleUpdated : handleCreated}
              onCancel={() => {
                setShowForm(false)
                setEditingBackground(null)
              }}
            />
          ) : (
            <>
              <button
                onClick={() => {
                  setEditingBackground(null)
                  setShowForm(true)
                }}
                className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors'
              >
                + Add Background
              </button>

              {backgrounds.length === 0 && (
                <p className='text-stone-500 text-sm text-center'>No backgrounds yet.</p>
              )}

              {backgrounds.map((bg) => (
                <div
                  key={bg.id}
                  className='bg-stone-800/50 border border-stone-700 rounded-lg p-3 space-y-2'
                >
                  <div className='flex items-center gap-3'>
                    {bg.backgroundUrl ? (
                      <div className='w-16 h-10 rounded overflow-hidden border border-stone-600 relative shrink-0'>
                        <Image
                          src={bg.backgroundUrl}
                          alt={bg.name}
                          fill
                          className='object-cover'
                        />
                      </div>
                    ) : (
                      <div className='w-16 h-10 rounded bg-stone-700 border border-stone-600 flex items-center justify-center text-stone-500 text-xs shrink-0'>
                        No img
                      </div>
                    )}
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-stone-100'>{bg.name}</p>
                      <p className='text-[10px] text-stone-500 font-mono'>{bg.id}</p>
                    </div>
                    <div className='flex gap-1.5'>
                      <button
                        onClick={() => {
                          setEditingBackground(bg)
                          setShowForm(true)
                        }}
                        className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-amber-300 hover:border-amber-700 transition-colors'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(bg.id)}
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

interface BackgroundFormProps {
  background: Background | null
  existingIds: string[]
  onSave: (background: Background) => void
  onCancel: () => void
}

function BackgroundForm({ background, existingIds, onSave, onCancel }: BackgroundFormProps) {
  const isEdit = !!background
  const [name, setName] = useState(background?.name ?? "")
  const [bgId, setBgId] = useState(background?.id ?? "")
  const [bgFile, setBgFile] = useState<File | null>(null)
  const [bgPreview, setBgPreview] = useState(background?.backgroundUrl ?? "")
  const [currentBgUrl] = useState(background?.backgroundUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")

  function handleNameChange(newName: string) {
    setName(newName)
    if (!isEdit) {
      setBgId(
        newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      )
    }
  }

  function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgFile(file)
    setBgPreview(URL.createObjectURL(file))
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", folder)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    if (!res.ok) throw new Error(`Upload failed: ${file.name}`)
    const data = await res.json()
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let finalBgUrl = currentBgUrl
      if (bgFile) {
        setUploadStatus("Uploading background…")
        finalBgUrl = await uploadFile(bgFile, "unity-halls/backgrounds")
        setUploadStatus("")
      }

      if (isEdit) {
        const res = await fetch("/api/themes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: background!.id, name, backgroundUrl: finalBgUrl }),
        })
        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(typeof data.error === "string" ? data.error : "Failed to update background.")
        }
      } else {
        if (existingIds.includes(bgId)) {
          setError("Background ID already exists.")
          setSaving(false)
          return
        }
        const res = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: bgId, name, backgroundUrl: finalBgUrl }),
        })
        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(typeof data.error === "string" ? data.error : "Failed to create background.")
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-serif font-semibold text-amber-300'>
          {isEdit ? "Edit Background" : "Add Background"}
        </h3>
        <button type='button' onClick={onCancel} className='text-xs text-stone-400 hover:text-stone-200'>
          Cancel
        </button>
      </div>

      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>Name</label>
        <input
          type='text'
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder='Dark Forest'
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>

      {!isEdit && (
        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>ID (slug)</label>
          <input
            type='text'
            required
            value={bgId}
            onChange={(e) => setBgId(e.target.value)}
            pattern='^[a-z0-9-]+$'
            placeholder='dark-forest'
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500'
          />
        </div>
      )}

      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>Background Image</label>
        <div className='flex items-center gap-3'>
          {bgPreview ? (
            <div className='w-24 h-14 rounded overflow-hidden border border-stone-600 relative shrink-0'>
              <Image src={bgPreview} alt='Background' fill className='object-cover' />
            </div>
          ) : (
            <div className='w-24 h-14 rounded bg-stone-700 border border-stone-600 flex items-center justify-center text-stone-500 text-xs shrink-0'>
              No image
            </div>
          )}
          <label className='cursor-pointer px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors'>
            Choose Image
            <input type='file' accept='image/*' onChange={handleBgChange} className='hidden' />
          </label>
        </div>
      </div>

      {error && <p className='text-red-400 text-xs'>{error}</p>}
      {uploadStatus && <p className='text-amber-400 text-xs'>{uploadStatus}</p>}

      <button
        type='submit'
        disabled={saving}
        className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50'
      >
        {saving ? "Saving…" : isEdit ? "Update Background" : "Create Background"}
      </button>
    </form>
  )
}
