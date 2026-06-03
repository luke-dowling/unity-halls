"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import type { ParticleEffect } from "@/components/ParticleOverlay"

interface Background {
  id: string
  name: string
  backgroundUrl: string
}

interface Soundtrack {
  id: string
  name: string
  trackUrls: string[]
}

const BACKGROUND_ICONS: Record<string, string> = {
  forest: "🌲",
  castle: "🏰",
  battle: "⚔️",
  tavern: "🍺",
  dungeon: "🕯️",
  camp: "🏕️",
  "world-map": "🗺️",
}

interface DmControlsProps {
  backgrounds: Background[]
  currentBackgroundId: string
  onBackgroundSelect: (backgroundId: string) => void
  soundtracks: Soundtrack[]
  currentSoundtrackId: string | null
  onSoundtrackSelect: (soundtrackId: string) => void
  isPlaying: boolean
  onPlayPause: () => void
  onNextTrack: () => void
  volume: number
  onVolumeChange: (volume: number) => void
  currentTrackIndex: number
  totalTracks: number
  currentParticleEffect: ParticleEffect
  onParticleEffectSelect: (effect: ParticleEffect) => void
  name: string
  characterName: string
  shadowColor: string
  onShadowColorChange: (color: string) => void
  onProfileUpdated: (profile: { name: string; characterName: string }) => void
  onOpenPlayerManager: () => void
  onOpenThemeManager: () => void
}

export default function DmControls({
  backgrounds,
  currentBackgroundId,
  onBackgroundSelect,
  soundtracks,
  currentSoundtrackId,
  onSoundtrackSelect,
  isPlaying,
  onPlayPause,
  onNextTrack,
  volume,
  onVolumeChange,
  currentTrackIndex,
  totalTracks,
  currentParticleEffect,
  onParticleEffectSelect,
  name: initialName,
  characterName: initialCharacterName,
  shadowColor,
  onShadowColorChange,
  onProfileUpdated,
  onOpenPlayerManager,
  onOpenThemeManager,
}: DmControlsProps) {
  const [dmName, setDmName] = useState(initialName)
  const [dmCharacterName, setDmCharacterName] = useState(initialCharacterName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [stagingColor, setStagingColor] = useState(shadowColor)
  const [broadcasting, setBroadcasting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSelect(backgroundId: string) {
    if (backgroundId === currentBackgroundId) return
    setBroadcasting(true)
    setSent(false)

    await onBackgroundSelect(backgroundId)

    setBroadcasting(false)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-amber-400 font-serif text-base font-semibold'>
        DM Controls
      </h2>

      {/* Background selector */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Background
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {backgrounds.map((bg) => (
            <button
              key={bg.id}
              type='button'
              onClick={() => handleSelect(bg.id)}
              disabled={broadcasting}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                currentBackgroundId === bg.id
                  ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-md shadow-amber-500/20"
                  : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
              }`}
            >
              <span className='text-lg'>{BACKGROUND_ICONS[bg.id] ?? "🎭"}</span>
              <span>{bg.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Soundtrack selector */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Soundtrack
        </label>
        <div className='grid grid-cols-2 gap-2'>
          {soundtracks.map((st) => (
            <button
              key={st.id}
              type='button'
              onClick={() => onSoundtrackSelect(st.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                currentSoundtrackId === st.id
                  ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-md shadow-amber-500/20"
                  : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
              }`}
            >
              <span className='text-base'>🎵</span>
              <span className='truncate'>{st.name}</span>
            </button>
          ))}
          {soundtracks.length === 0 && (
            <p className='col-span-2 text-xs text-stone-500 text-center py-2'>No soundtracks yet</p>
          )}
        </div>
      </div>

      {/* Music controls */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Music
        </label>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onPlayPause}
            disabled={totalTracks === 0}
            className='p-2 rounded-lg border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M10 9v6m4-6v6' />
              </svg>
            ) : (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' />
              </svg>
            )}
          </button>
          <button
            type='button'
            onClick={onNextTrack}
            disabled={totalTracks <= 1}
            className='p-2 rounded-lg border border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed'
            title='Next track'
          >
            <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
              <path strokeLinecap='round' strokeLinejoin='round' d='M16 5v14' />
            </svg>
          </button>
          {totalTracks > 0 && (
            <span className='text-xs text-stone-500 ml-1'>
              {currentTrackIndex + 1}/{totalTracks}
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4 text-stone-400 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' />
          </svg>
          <input
            type='range'
            min={0}
            max={0.25}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className='flex-1 h-1 accent-amber-500 bg-stone-700 rounded-full appearance-none cursor-pointer'
          />
          <span className='text-xs text-stone-500 w-8 text-right tabular-nums'>
            {Math.round(volume * 400)}%
          </span>
        </div>
      </div>

      {/* Particle effect selector */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Atmosphere
        </label>
        <div className='grid grid-cols-3 gap-1.5'>
          {(
            [
              { effect: "none", label: "None", icon: "○" },
              { effect: "snow", label: "Snow", icon: "❄" },
              { effect: "rain", label: "Rain", icon: "🌧" },
              { effect: "embers", label: "Embers", icon: "🔥" },
              { effect: "fog", label: "Fog", icon: "🌫" },
            ] as { effect: ParticleEffect; label: string; icon: string }[]
          ).map(({ effect, label, icon }) => (
            <button
              key={effect}
              type='button'
              onClick={() => onParticleEffectSelect(effect)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                currentParticleEffect === effect
                  ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-sm shadow-amber-500/20"
                  : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
              }`}
            >
              <span className='text-base leading-none'>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      {broadcasting && (
        <p className='text-xs text-stone-400 text-center'>Broadcasting…</p>
      )}
      {sent && (
        <p className='text-xs text-amber-400 text-center'>✓ Background updated!</p>
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
            <span>🖼️</span> Backgrounds
          </button>
        </div>
      </div>

      {/* DM Name & Title */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Name
        </label>
        <input
          type='text'
          value={dmName}
          onChange={(e) => setDmName(e.target.value)}
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Title
        </label>
        <input
          type='text'
          value={dmCharacterName}
          onChange={(e) => setDmCharacterName(e.target.value)}
          className='w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500'
        />
      </div>
      <button
        type='button'
        disabled={savingProfile}
        onClick={async () => {
          setSavingProfile(true)
          setProfileSaved(false)
          await fetch("/api/users/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: dmName, characterName: dmCharacterName }),
          })
          onProfileUpdated({ name: dmName, characterName: dmCharacterName })
          setSavingProfile(false)
          setProfileSaved(true)
          setTimeout(() => setProfileSaved(false), 2000)
        }}
        className='w-full px-3 py-1.5 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors disabled:opacity-50'
      >
        {savingProfile ? "Saving…" : "Update Profile"}
      </button>
      {profileSaved && (
        <p className='text-xs text-amber-400 text-center'>✓ Profile updated!</p>
      )}

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
          <span className='text-xs text-stone-400 font-mono'>{stagingColor}</span>
          <div
            className='w-8 h-8 rounded-lg border border-stone-600'
            style={{ boxShadow: `0 0 12px 3px ${stagingColor}99`, backgroundColor: "#1c1917" }}
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

      {/* Logout */}
      <button
        type='button'
        onClick={() => signOut({ callbackUrl: "/login" })}
        className='w-full px-3 py-2 rounded-lg border border-red-800 bg-red-900/30 text-red-400 text-sm font-medium hover:bg-red-800/40 hover:text-red-300 transition-colors'
      >
        Logout
      </button>
    </div>
  )
}
