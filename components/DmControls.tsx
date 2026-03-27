"use client"

import { useState } from "react"

interface Theme {
  id: string
  name: string
  backgroundUrl: string
  musicUrls: string[]
}

const THEME_ICONS: Record<string, string> = {
  forest: "🌲",
  castle: "🏰",
  battle: "⚔️",
  tavern: "🍺",
  dungeon: "🕯️",
  camp: "🏕️",
  "world-map": "🗺️",
}

interface DmControlsProps {
  themes: Theme[]
  currentThemeId: string
  onThemeSelect: (themeId: string) => void
}

export default function DmControls({
  themes,
  currentThemeId,
  onThemeSelect,
}: DmControlsProps) {
  const [broadcasting, setBroadcasting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSelect(themeId: string) {
    if (themeId === currentThemeId) return
    setBroadcasting(true)
    setSent(false)

    await onThemeSelect(themeId)

    setBroadcasting(false)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-amber-400 font-serif text-base font-semibold'>
        DM Controls
      </h2>

      {/* Theme selector */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Theme
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {themes.map((theme) => (
            <button
              key={theme.id}
              type='button'
              onClick={() => handleSelect(theme.id)}
              disabled={broadcasting}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                currentThemeId === theme.id
                  ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-md shadow-amber-500/20"
                  : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
              }`}
            >
              <span className='text-lg'>{THEME_ICONS[theme.id] ?? "🎭"}</span>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {broadcasting && (
        <p className='text-xs text-stone-400 text-center'>Broadcasting…</p>
      )}
      {sent && (
        <p className='text-xs text-amber-400 text-center'>✓ Theme updated!</p>
      )}
    </div>
  )
}
