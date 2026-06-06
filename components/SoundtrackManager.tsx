"use client"

import { useState, useEffect } from "react"

interface Track {
  id: string
  name: string
  url: string
  soundtracks?: { soundtrack: { id: string; name: string } }[]
}

interface Soundtrack {
  id: string
  name: string
  tracks: Track[]
}

interface SoundtrackManagerProps {
  onClose: () => void
  onSoundtracksChanged: (soundtracks: Soundtrack[]) => void
}

type View = "soundtracks" | "library"

export default function SoundtrackManager({ onClose, onSoundtracksChanged }: SoundtrackManagerProps) {
  const [soundtracks, setSoundtracks] = useState<Soundtrack[]>([])
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>("soundtracks")

  useEffect(() => {
    Promise.all([
      fetch("/api/soundtracks").then((r) => r.json()),
      fetch("/api/tracks").then((r) => r.json()),
    ]).then(([sts, tracks]) => {
      setSoundtracks(sts as Soundtrack[])
      setAllTracks(tracks as Track[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function notifyChange(next: Soundtrack[]) {
    setSoundtracks(next)
    onSoundtracksChanged(next)
  }

  async function refreshSoundtrack(id: string) {
    const res = await fetch("/api/soundtracks")
    if (res.ok) {
      const all: Soundtrack[] = await res.json()
      notifyChange(all)
      return all.find((s) => s.id === id) ?? null
    }
    return null
  }

  async function handleCreateSoundtrack(name: string) {
    const res = await fetch("/api/soundtracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const created: Soundtrack = await res.json()
      notifyChange([...soundtracks, created].sort((a, b) => a.name.localeCompare(b.name)))
    }
  }

  async function handleDeleteSoundtrack(id: string) {
    const res = await fetch(`/api/soundtracks?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (res.ok) notifyChange(soundtracks.filter((s) => s.id !== id))
  }

  async function handleRenameSoundtrack(id: string, name: string) {
    const res = await fetch("/api/soundtracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    })
    if (res.ok) {
      const updated: Soundtrack = await res.json()
      notifyChange(
        soundtracks.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
      )
    }
  }

  async function handleUploadAndAddTrack(soundtrackId: string, file: File) {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "unity-halls/soundtracks")
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
    if (!uploadRes.ok) throw new Error(`Upload failed: ${file.name}`)
    const { url } = await uploadRes.json() as { url: string }

    const trackRes = await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), url }),
    })
    if (!trackRes.ok) throw new Error("Failed to create track record.")
    const track: Track = await trackRes.json()

    const linkRes = await fetch("/api/soundtrack-tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundtrackId, trackId: track.id }),
    })
    if (!linkRes.ok) throw new Error("Failed to link track to soundtrack.")

    setAllTracks((prev) => [...prev, track].sort((a, b) => a.name.localeCompare(b.name)))
    await refreshSoundtrack(soundtrackId)
  }

  async function handleAddExistingTrack(soundtrackId: string, trackId: string) {
    const res = await fetch("/api/soundtrack-tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundtrackId, trackId }),
    })
    if (res.ok) await refreshSoundtrack(soundtrackId)
  }

  async function handleRemoveTrackFromSoundtrack(soundtrackId: string, trackId: string) {
    const res = await fetch(
      `/api/soundtrack-tracks?soundtrackId=${encodeURIComponent(soundtrackId)}&trackId=${encodeURIComponent(trackId)}`,
      { method: "DELETE" }
    )
    if (res.ok) await refreshSoundtrack(soundtrackId)
  }

  async function handleRenameTrack(trackId: string, name: string) {
    const res = await fetch("/api/tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: trackId, name }),
    })
    if (res.ok) {
      const updated: Track = await res.json()
      setAllTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, name: updated.name } : t))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      notifyChange(
        soundtracks.map((st) => ({
          ...st,
          tracks: st.tracks.map((t) => (t.id === trackId ? { ...t, name: updated.name } : t)),
        }))
      )
    }
  }

  async function handleDeleteTrack(trackId: string) {
    const res = await fetch(`/api/tracks?id=${encodeURIComponent(trackId)}`, { method: "DELETE" })
    if (res.ok) {
      setAllTracks((prev) => prev.filter((t) => t.id !== trackId))
      notifyChange(
        soundtracks.map((st) => ({
          ...st,
          tracks: st.tracks.filter((t) => t.id !== trackId),
        }))
      )
    }
  }

  return (
    <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-none border-b border-stone-700 p-4 flex items-center justify-between">
          <h2 className="text-lg font-serif font-semibold text-amber-400">Manage Soundtracks</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-100 text-xl transition-colors">
            &times;
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex-none flex border-b border-stone-700">
          {(["soundtracks", "library"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                view === v
                  ? "text-amber-400 border-b-2 border-amber-500 -mb-px"
                  : "text-stone-500 hover:text-stone-300"
              }`}
            >
              {v === "soundtracks" ? "Soundtracks" : "Track Library"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <p className="text-stone-400 text-sm">Loading…</p>
          ) : view === "soundtracks" ? (
            <SoundtracksView
              soundtracks={soundtracks}
              allTracks={allTracks}
              onCreate={handleCreateSoundtrack}
              onDelete={handleDeleteSoundtrack}
              onRename={handleRenameSoundtrack}
              onUploadAndAdd={handleUploadAndAddTrack}
              onAddExisting={handleAddExistingTrack}
              onRemoveTrack={handleRemoveTrackFromSoundtrack}
            />
          ) : (
            <LibraryView
              tracks={allTracks}
              soundtracks={soundtracks}
              onRename={handleRenameTrack}
              onDelete={handleDeleteTrack}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Soundtracks view                                                   */
/* ------------------------------------------------------------------ */

function SoundtracksView({
  soundtracks,
  allTracks,
  onCreate,
  onDelete,
  onRename,
  onUploadAndAdd,
  onAddExisting,
  onRemoveTrack,
}: {
  soundtracks: Soundtrack[]
  allTracks: Track[]
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onUploadAndAdd: (soundtrackId: string, file: File) => Promise<void>
  onAddExisting: (soundtrackId: string, trackId: string) => Promise<void>
  onRemoveTrack: (soundtrackId: string, trackId: string) => Promise<void>
}) {
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    await onCreate(newName)
    setNewName("")
    setShowNewForm(false)
    setCreating(false)
  }

  return (
    <>
      {showNewForm ? (
        <form onSubmit={handleCreate} className="bg-stone-800/50 border border-stone-700 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-serif text-amber-300">New Soundtrack</span>
            <button type="button" onClick={() => setShowNewForm(false)} className="text-xs text-stone-400 hover:text-stone-200">Cancel</button>
          </div>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Tavern Ambience"
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create Soundtrack"}
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full px-4 py-2 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors"
        >
          + Add Soundtrack
        </button>
      )}

      {soundtracks.length === 0 && <p className="text-stone-500 text-sm text-center">No soundtracks yet.</p>}

      {soundtracks.map((st) => (
        <SoundtrackRow
          key={st.id}
          soundtrack={st}
          allTracks={allTracks}
          expanded={expandedId === st.id}
          onToggle={() => setExpandedId(expandedId === st.id ? null : st.id)}
          onDelete={() => onDelete(st.id)}
          onRename={(name) => onRename(st.id, name)}
          onUploadAndAdd={(file) => onUploadAndAdd(st.id, file)}
          onAddExisting={(trackId) => onAddExisting(st.id, trackId)}
          onRemoveTrack={(trackId) => onRemoveTrack(st.id, trackId)}
        />
      ))}
    </>
  )
}

function SoundtrackRow({
  soundtrack,
  allTracks,
  expanded,
  onToggle,
  onDelete,
  onRename,
  onUploadAndAdd,
  onAddExisting,
  onRemoveTrack,
}: {
  soundtrack: Soundtrack
  allTracks: Track[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onRename: (name: string) => Promise<void>
  onUploadAndAdd: (file: File) => Promise<void>
  onAddExisting: (trackId: string) => Promise<void>
  onRemoveTrack: (trackId: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(soundtrack.name)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showAddExisting, setShowAddExisting] = useState(false)

  const trackIdsInSt = new Set(soundtrack.tracks.map((t) => t.id))
  const availableTracks = allTracks.filter((t) => !trackIdsInSt.has(t.id))

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onRename(editName)
    setSaving(false)
    setEditing(false)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of files) await onUploadAndAdd(file)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    }
    setUploading(false)
    e.target.value = ""
  }

  return (
    <div className="bg-stone-800/50 border border-stone-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={onToggle} className="text-stone-400 text-xs w-3 shrink-0">
          {expanded ? "▾" : "▸"}
        </button>
        {editing ? (
          <form onSubmit={handleRename} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="flex-1 bg-stone-700 border border-stone-500 rounded px-2 py-0.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" disabled={saving} className="text-xs text-amber-400 hover:text-amber-300 shrink-0">
              {saving ? "…" : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setEditName(soundtrack.name) }} className="text-xs text-stone-400 hover:text-stone-200 shrink-0">
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" onClick={onToggle} className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className="font-medium text-stone-100 text-sm truncate">{soundtrack.name}</span>
            <span className="text-xs text-stone-500 shrink-0">
              {soundtrack.tracks.length} {soundtrack.tracks.length === 1 ? "track" : "tracks"}
            </span>
          </button>
        )}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-2 py-1 text-xs rounded border border-stone-600 text-stone-400 hover:text-amber-300 hover:border-amber-700 transition-colors"
            >
              Rename
            </button>
            {confirmDelete ? (
              <>
                <span className="text-xs text-red-400">Delete?</span>
                <button type="button" onClick={() => { onDelete(); setConfirmDelete(false) }} className="px-1.5 py-0.5 text-xs rounded border border-red-700 text-red-400 hover:bg-red-900/40">Yes</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-1.5 py-0.5 text-xs rounded border border-stone-600 text-stone-400 hover:text-stone-200">No</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="px-2 py-1 text-xs rounded border border-stone-600 text-stone-400 hover:text-red-400 hover:border-red-700 transition-colors">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-stone-700 px-3 py-2 space-y-1.5">
          {/* Track list */}
          {soundtrack.tracks.length === 0 && (
            <p className="text-xs text-stone-600 py-1">No tracks yet.</p>
          )}
          {soundtrack.tracks.map((track, i) => (
            <div key={track.id} className="flex items-center gap-2 py-0.5">
              <span className="text-xs text-stone-600 w-5 text-right shrink-0 tabular-nums">{i + 1}.</span>
              <span className="flex-1 text-xs text-stone-300 truncate">{track.name}</span>
              <button
                type="button"
                onClick={() => onRemoveTrack(track.id)}
                className="shrink-0 text-xs text-stone-500 hover:text-red-400 transition-colors px-1"
                title="Remove from this soundtrack"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Actions */}
          <div className="pt-1.5 flex flex-wrap gap-2">
            <label className={`cursor-pointer px-3 py-1.5 text-xs rounded border transition-colors ${uploading ? "border-stone-600 text-stone-500 cursor-not-allowed" : "border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300"}`}>
              {uploading ? "Uploading…" : "+ Upload Track"}
              <input type="file" accept="audio/*" multiple disabled={uploading} onChange={handleFileChange} className="hidden" />
            </label>

            {availableTracks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddExisting(!showAddExisting)}
                className="px-3 py-1.5 text-xs rounded border border-stone-600 text-stone-300 hover:border-amber-700 hover:text-amber-300 transition-colors"
              >
                + Add from Library
              </button>
            )}
          </div>

          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

          {/* Add existing track picker */}
          {showAddExisting && availableTracks.length > 0 && (
            <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {availableTracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={async () => {
                    await onAddExisting(track.id)
                    setShowAddExisting(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800 hover:text-amber-300 transition-colors"
                >
                  {track.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Track Library view                                                 */
/* ------------------------------------------------------------------ */

function LibraryView({
  tracks,
  soundtracks,
  onRename,
  onDelete,
}: {
  tracks: Track[]
  soundtracks: Soundtrack[]
  onRename: (trackId: string, name: string) => Promise<void>
  onDelete: (trackId: string) => Promise<void>
}) {
  if (tracks.length === 0) {
    return <p className="text-stone-500 text-sm text-center py-8">No tracks yet. Upload some via a soundtrack.</p>
  }

  return (
    <div className="space-y-1">
      {tracks.map((track) => (
        <TrackLibraryRow
          key={track.id}
          track={track}
          soundtracks={soundtracks}
          onRename={(name) => onRename(track.id, name)}
          onDelete={() => onDelete(track.id)}
        />
      ))}
    </div>
  )
}

function TrackLibraryRow({
  track,
  soundtracks,
  onRename,
  onDelete,
}: {
  track: Track
  soundtracks: Soundtrack[]
  onRename: (name: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(track.name)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const usedIn = soundtracks.filter((st) => st.tracks.some((t) => t.id === track.id))

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onRename(editName)
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="bg-stone-800/50 border border-stone-700 rounded-lg px-3 py-2 space-y-1">
      <div className="flex items-center gap-2">
        {editing ? (
          <form onSubmit={handleRename} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="flex-1 bg-stone-700 border border-stone-500 rounded px-2 py-0.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" disabled={saving} className="text-xs text-amber-400 hover:text-amber-300 shrink-0">
              {saving ? "…" : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setEditName(track.name) }} className="text-xs text-stone-400 hover:text-stone-200 shrink-0">
              Cancel
            </button>
          </form>
        ) : (
          <span className="flex-1 text-sm text-stone-200 truncate">{track.name}</span>
        )}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-2 py-0.5 text-xs rounded border border-stone-600 text-stone-400 hover:text-amber-300 hover:border-amber-700 transition-colors"
            >
              Rename
            </button>
            {confirmDelete ? (
              <>
                <span className="text-xs text-red-400">Delete?</span>
                <button type="button" onClick={() => { onDelete(); setConfirmDelete(false) }} className="px-1.5 py-0.5 text-xs rounded border border-red-700 text-red-400 hover:bg-red-900/40">Yes</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-1.5 py-0.5 text-xs rounded border border-stone-600 text-stone-400 hover:text-stone-200">No</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="px-2 py-0.5 text-xs rounded border border-stone-600 text-stone-400 hover:text-red-400 hover:border-red-700 transition-colors">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {usedIn.length > 0 && (
        <p className="text-[10px] text-stone-500 truncate">
          Used in: {usedIn.map((s) => s.name).join(", ")}
        </p>
      )}
    </div>
  )
}
