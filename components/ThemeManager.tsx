"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface Theme {
  id: string
  name: string
  backgroundUrl: string
  musicUrls: string[]
}

interface ThemeManagerProps {
  onClose: () => void
  onThemesChanged: (themes: Theme[]) => void
}

export default function ThemeManager({
  onClose,
  onThemesChanged,
}: ThemeManagerProps) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch("/api/themes")
      .then((r) => r.json())
      .then((data) => {
        setThemes(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleCreated(theme: Theme) {
    const next = [...themes, theme].sort((a, b) => a.name.localeCompare(b.name))
    setThemes(next)
    onThemesChanged(next)
    setShowForm(false)
  }

  function handleUpdated(theme: Theme) {
    const next = themes
      .map((t) => (t.id === theme.id ? theme : t))
      .sort((a, b) => a.name.localeCompare(b.name))
    setThemes(next)
    onThemesChanged(next)
    setEditingTheme(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/themes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (res.ok) {
      const next = themes.filter((t) => t.id !== id)
      setThemes(next)
      onThemesChanged(next)
    }
  }

  return (
    <div className='fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4'>
      <div className='bg-stone-900 border border-stone-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-stone-900 border-b border-stone-700 p-4 flex items-center justify-between z-10'>
          <h2 className='text-lg font-serif font-semibold text-amber-400'>
            Manage Themes
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
            <ThemeForm
              theme={editingTheme}
              existingIds={themes.map((t) => t.id)}
              onSave={editingTheme ? handleUpdated : handleCreated}
              onCancel={() => {
                setShowForm(false)
                setEditingTheme(null)
              }}
            />
          ) : (
            <>
              <button
                onClick={() => {
                  setEditingTheme(null)
                  setShowForm(true)
                }}
                className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors'
              >
                + Add Theme
              </button>

              {themes.length === 0 && (
                <p className='text-stone-500 text-sm text-center'>
                  No themes yet.
                </p>
              )}

              {themes.map((theme) => (
                <div
                  key={theme.id}
                  className='bg-stone-800/50 border border-stone-700 rounded-lg p-3 space-y-2'
                >
                  <div className='flex items-center gap-3'>
                    {theme.backgroundUrl ? (
                      <div className='w-16 h-10 rounded overflow-hidden border border-stone-600 relative shrink-0'>
                        <Image
                          src={theme.backgroundUrl}
                          alt={theme.name}
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
                      <p className='text-sm font-medium text-stone-100'>
                        {theme.name}
                      </p>
                      <p className='text-[10px] text-stone-500 font-mono'>
                        {theme.id}
                      </p>
                      <p className='text-[10px] text-stone-400'>
                        {theme.musicUrls.length} song
                        {theme.musicUrls.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className='flex gap-1.5'>
                      <button
                        onClick={() => {
                          setEditingTheme(theme)
                          setShowForm(true)
                        }}
                        className='px-2 py-1 text-xs rounded border border-stone-600 text-stone-300 hover:text-amber-300 hover:border-amber-700 transition-colors'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(theme.id)}
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
/*  Theme form (create + edit)                                        */
/* ------------------------------------------------------------------ */

interface ThemeFormProps {
  theme: Theme | null
  existingIds: string[]
  onSave: (theme: Theme) => void
  onCancel: () => void
}

function ThemeForm({ theme, existingIds, onSave, onCancel }: ThemeFormProps) {
  const isEdit = !!theme
  const [name, setName] = useState(theme?.name ?? "")
  const [themeId, setThemeId] = useState(theme?.id ?? "")
  const [backgroundUrl] = useState(theme?.backgroundUrl ?? "")
  const [musicUrls, setMusicUrls] = useState<string[]>(theme?.musicUrls ?? [])

  const [bgFile, setBgFile] = useState<File | null>(null)
  const [bgPreview, setBgPreview] = useState(theme?.backgroundUrl ?? "")
  const [musicFiles, setMusicFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")

  function handleNameChange(newName: string) {
    setName(newName)
    if (!isEdit) {
      setThemeId(
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

  function handleMusicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setMusicFiles((prev) => [...prev, ...files])
  }

  function removeMusicUrl(index: number) {
    setMusicUrls((prev) => prev.filter((_, i) => i !== index))
  }

  function removeMusicFile(index: number) {
    setMusicFiles((prev) => prev.filter((_, i) => i !== index))
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
      // Upload background
      let finalBgUrl = backgroundUrl
      if (bgFile) {
        setUploadStatus("Uploading background…")
        finalBgUrl = await uploadFile(bgFile, "unity-halls/backgrounds")
      }

      // Upload new music files
      const newMusicUrls: string[] = []
      for (let i = 0; i < musicFiles.length; i++) {
        setUploadStatus(`Uploading song ${i + 1} of ${musicFiles.length}…`)
        const url = await uploadFile(musicFiles[i], "unity-halls/music")
        newMusicUrls.push(url)
      }

      const finalMusicUrls = [...musicUrls, ...newMusicUrls]
      setUploadStatus("")

      if (isEdit) {
        const res = await fetch("/api/themes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: theme!.id,
            name,
            backgroundUrl: finalBgUrl,
            musicUrls: finalMusicUrls,
          }),
        })

        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to update theme.",
          )
        }
      } else {
        if (existingIds.includes(themeId)) {
          setError("Theme ID already exists.")
          setSaving(false)
          return
        }

        const res = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: themeId,
            name,
            backgroundUrl: finalBgUrl,
            musicUrls: finalMusicUrls,
          }),
        })

        if (res.ok) {
          onSave(await res.json())
        } else {
          const data = await res.json()
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to create theme.",
          )
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
          {isEdit ? "Edit Theme" : "Add Theme"}
        </h3>
        <button
          type='button'
          onClick={onCancel}
          className='text-xs text-stone-400 hover:text-stone-200'
        >
          Cancel
        </button>
      </div>

      {/* Name */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Name
        </label>
        <input
          type='text'
          required
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder='Dark Forest'
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>

      {/* ID (create only) */}
      {!isEdit && (
        <div className='space-y-1'>
          <label className='block text-xs uppercase tracking-wider text-stone-400'>
            ID (slug)
          </label>
          <input
            type='text'
            required
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            pattern='^[a-z0-9-]+$'
            placeholder='dark-forest'
            className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 font-mono focus:outline-none focus:border-amber-500'
          />
        </div>
      )}

      {/* Background image */}
      <div className='space-y-1'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Background Image
        </label>
        <div className='flex items-center gap-3'>
          {bgPreview ? (
            <div className='w-24 h-14 rounded overflow-hidden border border-stone-600 relative shrink-0'>
              <Image
                src={bgPreview}
                alt='Background'
                fill
                className='object-cover'
              />
            </div>
          ) : (
            <div className='w-24 h-14 rounded bg-stone-700 border border-stone-600 flex items-center justify-center text-stone-500 text-xs shrink-0'>
              No image
            </div>
          )}
          <label className='cursor-pointer px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors'>
            Choose Image
            <input
              type='file'
              accept='image/*'
              onChange={handleBgChange}
              className='hidden'
            />
          </label>
        </div>
      </div>

      {/* Music tracks */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Music Tracks
        </label>

        {/* Existing URLs */}
        {musicUrls.map((url, i) => (
          <div
            key={`url-${i}`}
            className='flex items-center gap-2 bg-stone-800/50 rounded px-2 py-1'
          >
            <span className='text-xs text-stone-300 truncate flex-1'>
              🎵 {url.split("/").pop()}
            </span>
            <button
              type='button'
              onClick={() => removeMusicUrl(i)}
              className='text-xs text-red-400 hover:text-red-300'
            >
              ✕
            </button>
          </div>
        ))}

        {/* New files to upload */}
        {musicFiles.map((file, i) => (
          <div
            key={`file-${i}`}
            className='flex items-center gap-2 bg-stone-800/50 rounded px-2 py-1'
          >
            <span className='text-xs text-amber-300 truncate flex-1'>
              📤 {file.name}
            </span>
            <button
              type='button'
              onClick={() => removeMusicFile(i)}
              className='text-xs text-red-400 hover:text-red-300'
            >
              ✕
            </button>
          </div>
        ))}

        <label className='cursor-pointer inline-flex px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors'>
          + Add Songs
          <input
            type='file'
            accept='audio/*'
            multiple
            onChange={handleMusicChange}
            className='hidden'
          />
        </label>
      </div>

      {error && <p className='text-red-400 text-xs'>{error}</p>}
      {uploadStatus && <p className='text-amber-400 text-xs'>{uploadStatus}</p>}

      <button
        type='submit'
        disabled={saving}
        className='w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50'
      >
        {saving ? "Saving…" : isEdit ? "Update Theme" : "Create Theme"}
      </button>
    </form>
  )
}
