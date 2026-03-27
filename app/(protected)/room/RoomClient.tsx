"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { signOut } from "next-auth/react"
import VideoRoom from "@/components/VideoRoom"
import DmControls from "@/components/DmControls"
import Image from "next/image"

interface Theme {
  id: string
  name: string
  backgroundUrl: string
  musicUrls: string[]
}

interface RoomClientProps {
  sessionEmail: string
  sessionName: string
  sessionCharacterName?: string
  sessionPortraitId?: string
  sessionPlayerClass?: string
  sessionSeatIndex?: number
  isAdmin: boolean
  initialThemeId: string
  initialTheme: Theme | null
  initialIsLive: boolean
  themes: Theme[]
  devMode?: boolean
}

export default function RoomClient({
  sessionEmail,
  sessionName,
  sessionCharacterName,
  sessionPortraitId,
  sessionPlayerClass,
  sessionSeatIndex,
  isAdmin,
  initialThemeId,
  initialTheme,
  initialIsLive,
  themes,
  devMode,
}: RoomClientProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(initialTheme)
  const [currentThemeId, setCurrentThemeId] = useState(initialThemeId)
  const [isLive, setIsLive] = useState(initialIsLive)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [volume, setVolume] = useState(0.125)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function handleTrackEnded() {
    if (!currentTheme?.musicUrls.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentTheme.musicUrls.length)
  }

  function handlePlayPause() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  function handleNextTrack() {
    if (!currentTheme?.musicUrls.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentTheme.musicUrls.length)
    setIsPlaying(true)
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  // Keep audio element volume in sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume, currentTrackIndex, currentTheme])

  // Ref that VideoRoom populates so DmControls can call broadcastState
  const videoRoomApiRef = useRef<{
    broadcastTheme: (themeId: string, theme: Theme) => void
  } | null>(null)

  // Poll for room live status (players only)
  useEffect(() => {
    if (isAdmin || isLive) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/room/status")
        if (res.ok) {
          const data = await res.json()
          if (data.isLive) setIsLive(true)
        }
      } catch {}
    }, 3000)

    return () => clearInterval(interval)
  }, [isAdmin, isLive])

  // DM: set live when joining
  const handleDmJoined = useCallback(async () => {
    await fetch("/api/room/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: true }),
    })
    setIsLive(true)
  }, [])

  // DM: set not live when leaving
  const handleLeave = useCallback(async () => {
    if (isAdmin) {
      await fetch("/api/room/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: false }),
      })
    }
    setIsLive(false)
  }, [isAdmin])

  async function handleThemeBroadcast(themeId: string) {
    const theme = themes.find((t) => t.id === themeId)
    if (!theme) return

    await fetch("/api/room/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeId }),
    })

    videoRoomApiRef.current?.broadcastTheme(themeId, theme)
    setCurrentThemeId(themeId)
    setCurrentTheme(theme)
    setCurrentTrackIndex(0)
  }

  function handleThemeReceived(themeId: string, theme: Theme) {
    setCurrentThemeId(themeId)
    setCurrentTheme(theme)
    setCurrentTrackIndex(0)
  }

  // Waiting room for players when DM isn't live (skip in dev mode)
  if (!devMode && !isAdmin && !isLive) {
    return (
      <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6'>
        {sessionPortraitId && (
          <div className='w-32 h-32 rounded-full overflow-hidden border-4 border-amber-500/50 shadow-lg shadow-amber-500/20'>
            <Image
              src={`/portraits/${sessionPortraitId}`}
              alt={sessionCharacterName ?? sessionName}
              width={128}
              height={128}
              className='object-cover w-full h-full'
            />
          </div>
        )}
        {!sessionPortraitId && (
          <div className='w-32 h-32 rounded-full bg-stone-800 border-4 border-amber-500/50 flex items-center justify-center'>
            <span className='text-5xl text-stone-500 font-serif'>
              {(sessionCharacterName ?? sessionName)?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}
        <div className='text-center space-y-2'>
          <h2 className='text-xl font-serif text-amber-400'>
            {sessionCharacterName ?? sessionName}
          </h2>
          <p className='text-stone-400 text-sm'>is waiting for DM…</p>
        </div>
        <div className='w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin' />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className='mt-4 px-4 py-2 text-sm text-stone-400 hover:text-stone-100 border border-stone-700 hover:border-stone-500 rounded-lg transition-colors'
        >
          Log out
        </button>
      </main>
    )
  }

  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 relative overflow-hidden'>
      {/* Full-screen background */}
      {currentTheme?.backgroundUrl && (
        <div
          className='absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out'
          style={{ backgroundImage: `url(${currentTheme.backgroundUrl})` }}
        >
          <div className='absolute inset-0 bg-stone-950/60' />
        </div>
      )}

      {/* Content container */}
      <div className='relative z-10 min-h-screen flex flex-col'>
        {/* Top bar */}
        <header className='border-b border-stone-800/50 bg-stone-950/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between'>
          <span className='font-serif text-amber-400 text-lg'>Unity Halls</span>
          <div className='flex items-center gap-3 text-xs text-stone-400'>
            {currentTheme && (
              <span className='text-amber-300/70 font-serif'>
                {currentTheme.name}
              </span>
            )}
            {sessionCharacterName && (
              <span className='text-amber-300 font-medium'>
                {sessionCharacterName}
              </span>
            )}
            <span>{sessionName}</span>
            {isAdmin && (
              <a
                href='/admin'
                className='text-amber-500 hover:text-amber-400 underline'
              >
                Admin
              </a>
            )}
          </div>
        </header>

        {/* Video area (fills remaining space) */}
        <div className='flex-1 relative'>
          <VideoRoom
            sessionEmail={sessionEmail}
            sessionCharacterName={sessionCharacterName}
            sessionPortraitId={sessionPortraitId}
            sessionPlayerClass={sessionPlayerClass}
            sessionSeatIndex={sessionSeatIndex}
            isAdmin={isAdmin}
            currentTheme={currentTheme}
            onThemeChange={handleThemeReceived}
            onDmJoined={handleDmJoined}
            onLeave={handleLeave}
            roomStateRef={videoRoomApiRef}
            devMode={devMode}
          />
        </div>
      </div>

      {/* Audio player — loops through theme music playlist */}
      {currentTheme && currentTheme.musicUrls.length > 0 && (
        <audio
          ref={audioRef}
          key={`${currentTheme.id}-${currentTrackIndex}`}
          src={currentTheme.musicUrls[currentTrackIndex]}
          autoPlay={isPlaying}
          onEnded={handleTrackEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className='hidden'
        />
      )}

      {/* DM sidebar toggle */}
      {isAdmin && (
        <>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='fixed top-16 right-4 z-50 bg-stone-900/90 border border-amber-900/50 rounded-lg p-2 text-amber-400 hover:text-amber-300 hover:bg-stone-800/90 transition-colors backdrop-blur-sm'
            title='DM Controls'
          >
            {sidebarOpen ? (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            ) : (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='w-5 h-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={2}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M4 6h16M4 12h16M4 18h16'
                />
              </svg>
            )}
          </button>

          {/* Sidebar overlay */}
          <aside
            className={`fixed top-0 right-0 h-full w-80 bg-stone-950/95 border-l border-stone-800 backdrop-blur-sm z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className='p-4 pt-16'>
              <DmControls
                themes={themes}
                currentThemeId={currentThemeId}
                onThemeSelect={handleThemeBroadcast}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNextTrack={handleNextTrack}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                currentTrackIndex={currentTrackIndex}
                totalTracks={currentTheme?.musicUrls.length ?? 0}
              />
            </div>
          </aside>
        </>
      )}
    </main>
  )
}
