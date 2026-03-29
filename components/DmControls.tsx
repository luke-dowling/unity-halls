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
  isPlaying: boolean
  onPlayPause: () => void
  onNextTrack: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  currentTrackIndex: number
  totalTracks: number
  shadowColor: string
  onShadowColorChange: (color: string) => void
  onOpenPlayerManager: () => void
  onOpenThemeManager: () => void
}

export default function DmControls({
  themes,
  currentThemeId,
  onThemeSelect,
  isPlaying,
  onPlayPause,
  onNextTrack,
  volume,
  onVolumeChange,
  currentTrackIndex,
  totalTracks,
  shadowColor,
  onShadowColorChange,
  onOpenPlayerManager,
  onOpenThemeManager,
}: DmControlsProps) {
  const [stagingColor, setStagingColor] = useState(shadowColor)
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

      {/* Audio controls */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Music
        </label>

        <div className='flex items-center gap-2'>
          {/* Play / Pause */}
          <button
            type='button'
            onClick={onPlayPause}
            disabled={totalTracks === 0}
            className='p-2 rounded-lg border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-4 h-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M10 9v6m4-6v6'
                />
              </svg>
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-4 h-4'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
                />
              </svg>
            )}
          </button>

          {/* Next track */}
          <button
            type='button'
            onClick={onNextTrack}
            disabled={totalTracks <= 1}
            className='p-2 rounded-lg border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
            title='Next track'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-4 h-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 5l7 7-7 7'
              />
              <path strokeLinecap='round' strokeLinejoin='round' d='M16 5v14' />
            </svg>
          </button>

          {/* Track indicator */}
          {totalTracks > 0 && (
            <span className='text-xs text-stone-500 ml-1'>
              {currentTrackIndex + 1}/{totalTracks}
            </span>
          )}
        </div>

        {/* Volume slider */}
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => onVolumeChange(0)}
            className='text-stone-400 hover:text-stone-200 transition-colors'
            title='Mute'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-4 h-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              {volume === 0 ? (
                <>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2'
                  />
                </>
              ) : (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'
                />
              )}
            </svg>
          </button>

          <input
            type='range'
            min={0}
            max={0.25}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className='flex-1 h-1 accent-amber-500 bg-stone-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500'
          />

          {/* Percentage label */}
          <span className='text-xs text-stone-500 w-8 text-right tabular-nums'>
            {Math.round(volume * 400)}%
          </span>

          <button
            type='button'
            onClick={() => onVolumeChange(0.25)}
            className='text-stone-400 hover:text-stone-200 transition-colors'
            title='Max volume'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-4 h-4'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728'
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Status */}
      {broadcasting && (
        <p className='text-xs text-stone-400 text-center'>Broadcasting…</p>
      )}
      {sent && (
        <p className='text-xs text-amber-400 text-center'>✓ Theme updated!</p>
      )}

      {/* Management buttons */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Management
        </label>
        <div className='grid grid-cols-2 gap-2'>
          <button
            type='button'
            onClick={onOpenPlayerManager}
            className='flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stone-700 text-stone-300 text-sm hover:border-amber-700 hover:text-amber-300 transition-colors'
          >
            <span>👤</span> Players
          </button>
          <button
            type='button'
            onClick={onOpenThemeManager}
            className='flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stone-700 text-stone-300 text-sm hover:border-amber-700 hover:text-amber-300 transition-colors'
          >
            <span>🎭</span> Themes
          </button>
        </div>
      </div>

      {/* Shadow color picker */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Your Shadow Color
        </label>
        <div className='flex items-center gap-3'>
          <input
            type='color'
            value={stagingColor}
            onChange={(e) => setStagingColor(e.target.value)}
            className='w-10 h-8 rounded border border-stone-600 bg-stone-800 cursor-pointer'
          />
          <span className='text-xs text-stone-400 font-mono'>
            {stagingColor}
          </span>
          <div
            className='w-8 h-8 rounded-lg border border-stone-600'
            style={{
              boxShadow: `0 0 12px 3px ${stagingColor}99`,
              backgroundColor: "#1c1917",
            }}
          />
        </div>
        <button
          type='button'
          onClick={() => onShadowColorChange(stagingColor)}
          className='w-full mt-1 px-3 py-1.5 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors'
        >
          Update Color
        </button>
      </div>
    </div>
  )
}
