"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import type { ParticleEffect } from "@/components/ParticleOverlay"

type Tab = "scene" | "music" | "atmosphere" | "players" | "profile"

interface Background {
  id: string
  name: string
  backgroundUrl: string
}

interface Track {
  id: string
  name: string
  url: string
}

interface Soundtrack {
  id: string
  name: string
  tracks: Track[]
}

interface DmPanelProps {
  backgrounds: Background[]
  currentBackgroundId: string
  onBackgroundSelect: (id: string) => void
  soundtracks: Soundtrack[]
  currentSoundtrackId: string | null
  onSoundtrackSelect: (id: string, trackIndex?: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onNextTrack: () => void
  volume: number
  onVolumeChange: (v: number) => void
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
  onOpenBackgroundManager: () => void
  onOpenSoundtrackManager: () => void
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

export default function DmPanel({
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
  onOpenBackgroundManager,
  onOpenSoundtrackManager,
}: DmPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("scene")

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "scene",
      label: "Scene",
      icon: (
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
            d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      ),
    },
    {
      id: "music",
      label: "Music",
      icon: (
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
            d='M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
          />
        </svg>
      ),
    },
    {
      id: "atmosphere",
      label: "Atmos",
      icon: (
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
            d='M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
          />
        </svg>
      ),
    },
    {
      id: "players",
      label: "Players",
      icon: (
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
            d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile",
      icon: (
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
            d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
          />
        </svg>
      ),
    },
  ]

  return (
    <div className='flex flex-col h-full'>
      {/* Tab nav */}
      <nav className='flex-none flex border-b border-stone-800 bg-stone-950/80'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type='button'
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-amber-400 border-b-2 border-amber-500 -mb-px"
                : "text-stone-500 hover:text-stone-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {activeTab === "scene" && (
          <SceneTab
            backgrounds={backgrounds}
            currentBackgroundId={currentBackgroundId}
            onBackgroundSelect={onBackgroundSelect}
            onOpenBackgroundManager={onOpenBackgroundManager}
          />
        )}
        {activeTab === "music" && (
          <MusicTab
            soundtracks={soundtracks}
            currentSoundtrackId={currentSoundtrackId}
            onSoundtrackSelect={onSoundtrackSelect}
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onNextTrack={onNextTrack}
            volume={volume}
            onVolumeChange={onVolumeChange}
            currentTrackIndex={currentTrackIndex}
            totalTracks={totalTracks}
            onOpenSoundtrackManager={onOpenSoundtrackManager}
          />
        )}
        {activeTab === "atmosphere" && (
          <AtmosphereTab
            currentParticleEffect={currentParticleEffect}
            onParticleEffectSelect={onParticleEffectSelect}
          />
        )}
        {activeTab === "players" && (
          <PlayersTab onOpenPlayerManager={onOpenPlayerManager} />
        )}
        {activeTab === "profile" && (
          <ProfileTab
            name={initialName}
            characterName={initialCharacterName}
            shadowColor={shadowColor}
            onShadowColorChange={onShadowColorChange}
            onProfileUpdated={onProfileUpdated}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Scene tab                                                          */
/* ------------------------------------------------------------------ */

function SceneTab({
  backgrounds,
  currentBackgroundId,
  onBackgroundSelect,
  onOpenBackgroundManager,
}: {
  backgrounds: Background[]
  currentBackgroundId: string
  onBackgroundSelect: (id: string) => void
  onOpenBackgroundManager: () => void
}) {
  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-2'>
        {backgrounds.map((bg) => (
          <button
            key={bg.id}
            type='button'
            onClick={() => onBackgroundSelect(bg.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
              currentBackgroundId === bg.id
                ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-md shadow-amber-500/20"
                : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
            }`}
          >
            <span className='text-lg'>{BACKGROUND_ICONS[bg.id] ?? "🎭"}</span>
            <span className='truncate text-left'>{bg.name}</span>
          </button>
        ))}
      </div>
      <button
        type='button'
        onClick={onOpenBackgroundManager}
        className='w-full px-3 py-2 rounded-lg border border-stone-700 text-stone-400 text-xs hover:border-amber-700 hover:text-amber-300 transition-colors'
      >
        Manage Backgrounds
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Music tab                                                          */
/* ------------------------------------------------------------------ */

function MusicTab({
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
  onOpenSoundtrackManager,
}: {
  soundtracks: Soundtrack[]
  currentSoundtrackId: string | null
  onSoundtrackSelect: (id: string, trackIndex?: number) => void
  isPlaying: boolean
  onPlayPause: () => void
  onNextTrack: () => void
  volume: number
  onVolumeChange: (v: number) => void
  currentTrackIndex: number
  totalTracks: number
  onOpenSoundtrackManager: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    currentSoundtrackId,
  )

  function handleSoundtrackClick(id: string) {
    if (id === currentSoundtrackId) {
      setExpandedId(expandedId === id ? null : id)
    } else {
      onSoundtrackSelect(id, 0)
      setExpandedId(id)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Playback controls */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Playback
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
          {totalTracks > 0 && (
            <span className='text-xs text-stone-500 ml-1 tabular-nums'>
              {currentTrackIndex + 1} / {totalTracks}
            </span>
          )}
          {totalTracks === 0 && (
            <span className='text-xs text-stone-600 ml-1'>No tracks</span>
          )}
        </div>

        {/* Volume */}
        <div className='flex items-center gap-2'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='w-4 h-4 text-stone-400 shrink-0'
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
          </svg>
          <input
            type='range'
            min={0}
            max={0.1}
            step={0.001}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className='flex-1 h-1 accent-amber-500 bg-stone-700 rounded-full appearance-none cursor-pointer'
          />
          <span className='text-xs text-stone-500 w-8 text-right tabular-nums'>
            {Math.round(volume * 400)}%
          </span>
        </div>
      </div>

      {/* Soundtrack list */}
      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Soundtracks
        </label>
        {soundtracks.length === 0 ? (
          <p className='text-xs text-stone-600 text-center py-4'>
            No soundtracks yet
          </p>
        ) : (
          <div className='space-y-1'>
            {soundtracks.map((st) => {
              const isActive = currentSoundtrackId === st.id
              const isExpanded = expandedId === st.id
              return (
                <div
                  key={st.id}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    isActive
                      ? "border-amber-500 bg-amber-900/30 shadow-sm shadow-amber-500/20"
                      : "border-stone-700"
                  }`}
                >
                  {/* Soundtrack header row */}
                  <button
                    type='button'
                    onClick={() => handleSoundtrackClick(st.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      isActive
                        ? "text-amber-300"
                        : "text-stone-300 hover:bg-stone-800/50"
                    }`}
                  >
                    <span className='text-stone-500 text-xs w-3 shrink-0'>
                      {isExpanded ? "▾" : "▸"}
                    </span>
                    <span className='text-sm shrink-0'>
                      {isActive && isPlaying ? "▶" : "🎵"}
                    </span>
                    <span className='flex-1 truncate font-medium'>
                      {st.name}
                    </span>
                    <span className='text-xs text-stone-500 shrink-0'>
                      {st.tracks.length}{" "}
                      {st.tracks.length === 1 ? "track" : "tracks"}
                    </span>
                  </button>

                  {/* Expandable track list */}
                  {isExpanded && st.tracks.length > 0 && (
                    <div className='border-t border-stone-700/60 bg-stone-900/50 py-1'>
                      {st.tracks.map((track, idx) => {
                        const isCurrentTrack =
                          isActive && currentTrackIndex === idx
                        return (
                          <button
                            key={track.id}
                            type='button'
                            onClick={() => onSoundtrackSelect(st.id, idx)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                              isCurrentTrack
                                ? "text-amber-300 bg-amber-900/20"
                                : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/40"
                            }`}
                          >
                            <span className='w-4 text-right shrink-0 tabular-nums text-stone-600'>
                              {isCurrentTrack && isPlaying ? "▶" : idx + 1}
                            </span>
                            <span className='flex-1 truncate'>
                              {track.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {isExpanded && st.tracks.length === 0 && (
                    <p className='px-3 py-2 text-xs text-stone-600 border-t border-stone-700/60'>
                      No tracks — add some via Manage Soundtracks
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <button
          type='button'
          onClick={onOpenSoundtrackManager}
          className='w-full px-3 py-2 rounded-lg border border-stone-700 text-stone-400 text-xs hover:border-amber-700 hover:text-amber-300 transition-colors'
        >
          Manage Soundtracks
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Atmosphere tab                                                     */
/* ------------------------------------------------------------------ */

function AtmosphereTab({
  currentParticleEffect,
  onParticleEffectSelect,
}: {
  currentParticleEffect: ParticleEffect
  onParticleEffectSelect: (effect: ParticleEffect) => void
}) {
  const effects: { effect: ParticleEffect; label: string; icon: string }[] = [
    { effect: "none", label: "None", icon: "○" },
    { effect: "snow", label: "Snow", icon: "❄" },
    { effect: "rain", label: "Rain", icon: "🌧" },
    { effect: "embers", label: "Embers", icon: "🔥" },
    { effect: "fog", label: "Fog", icon: "🌫" },
  ]

  return (
    <div className='space-y-2'>
      <label className='block text-xs uppercase tracking-wider text-stone-400'>
        Atmosphere
      </label>
      <div className='grid grid-cols-3 gap-2'>
        {effects.map(({ effect, label, icon }) => (
          <button
            key={effect}
            type='button'
            onClick={() => onParticleEffectSelect(effect)}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-xs transition-all ${
              currentParticleEffect === effect
                ? "border-amber-500 bg-amber-900/40 text-amber-300 shadow-sm shadow-amber-500/20"
                : "border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800/50"
            }`}
          >
            <span className='text-xl leading-none'>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Players tab                                                        */
/* ------------------------------------------------------------------ */

function PlayersTab({
  onOpenPlayerManager,
}: {
  onOpenPlayerManager: () => void
}) {
  return (
    <div className='space-y-3'>
      <p className='text-xs text-stone-500'>
        Manage player accounts, portraits, and seat assignments.
      </p>
      <button
        type='button'
        onClick={onOpenPlayerManager}
        className='w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-stone-700 text-stone-300 text-sm hover:border-amber-700 hover:text-amber-300 transition-colors'
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
            d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
        Open Player Manager
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Profile tab                                                        */
/* ------------------------------------------------------------------ */

function ProfileTab({
  name: initialName,
  characterName: initialCharacterName,
  shadowColor,
  onShadowColorChange,
  onProfileUpdated,
}: {
  name: string
  characterName: string
  shadowColor: string
  onShadowColorChange: (color: string) => void
  onProfileUpdated: (profile: { name: string; characterName: string }) => void
}) {
  const [dmName, setDmName] = useState(initialName)
  const [dmCharacterName, setDmCharacterName] = useState(initialCharacterName)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [stagingColor, setStagingColor] = useState(shadowColor)

  return (
    <div className='space-y-4'>
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
            body: JSON.stringify({
              name: dmName,
              characterName: dmCharacterName,
            }),
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

      <div className='space-y-2'>
        <label className='block text-xs uppercase tracking-wider text-stone-400'>
          Shadow Color
        </label>
        <div className='flex items-center gap-3'>
          <input
            type='color'
            value={stagingColor}
            onChange={(e) => setStagingColor(e.target.value)}
            className='w-10 h-8 rounded border border-stone-600 bg-stone-800 cursor-pointer'
          />
          <span className='text-xs text-stone-400 font-mono flex-1'>
            {stagingColor}
          </span>
          <div
            className='w-8 h-8 rounded-lg border border-stone-600 shrink-0'
            style={{
              boxShadow: `0 0 12px 3px ${stagingColor}99`,
              backgroundColor: "#1c1917",
            }}
          />
        </div>
        <button
          type='button'
          onClick={() => onShadowColorChange(stagingColor)}
          className='w-full px-3 py-1.5 rounded-lg border border-amber-700 bg-amber-900/40 text-amber-300 text-sm font-medium hover:bg-amber-800/50 transition-colors'
        >
          Apply Color
        </button>
      </div>

      <div className='pt-2 border-t border-stone-800'>
        <button
          type='button'
          onClick={() => signOut({ callbackUrl: "/login" })}
          className='w-full px-3 py-2 rounded-lg border border-red-800 bg-red-900/30 text-red-400 text-sm font-medium hover:bg-red-800/40 hover:text-red-300 transition-colors'
        >
          Logout
        </button>
      </div>
    </div>
  )
}
