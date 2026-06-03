"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import VideoRoom from "@/components/VideoRoom"
import DmPanel from "@/components/DmPanel"
import PlayerControls from "@/components/PlayerControls"
import ParticleOverlay, { type ParticleEffect } from "@/components/ParticleOverlay"
import PlayerManager from "@/components/PlayerManager"
import ThemeManager from "@/components/ThemeManager"
import Chat, { type ChatMessage } from "@/components/Chat"
import Image from "next/image"

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

interface RoomClientProps {
  sessionEmail: string
  sessionName: string
  sessionCharacterName?: string
  sessionPortraitId?: string
  sessionPortraitUrl?: string
  sessionPlayerClass?: string
  sessionSeatIndex?: number
  sessionShadowColor?: string
  isAdmin: boolean
  initialBackgroundId: string
  initialBackground: Background | null
  initialSoundtrack: Soundtrack | null
  initialIsLive: boolean
  backgrounds: Background[]
  soundtracks: Soundtrack[]
  devMode?: boolean
}

export default function RoomClient({
  sessionEmail,
  sessionName,
  sessionCharacterName,
  sessionPortraitId,
  sessionPortraitUrl,
  sessionPlayerClass,
  sessionSeatIndex,
  sessionShadowColor,
  isAdmin,
  initialBackgroundId,
  initialBackground,
  initialSoundtrack,
  initialIsLive,
  backgrounds,
  soundtracks,
  devMode,
}: RoomClientProps) {
  const router = useRouter()
  const [currentBackground, setCurrentBackground] = useState<Background | null>(initialBackground)
  const [currentBackgroundId, setCurrentBackgroundId] = useState(initialBackgroundId)
  const [currentSoundtrack, setCurrentSoundtrack] = useState<Soundtrack | null>(initialSoundtrack)
  const [soundtrackList, setSoundtrackList] = useState(soundtracks)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [volume, setVolume] = useState(0.01)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLive, setIsLive] = useState(initialIsLive)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dmShadowColor, setDmShadowColor] = useState(sessionShadowColor ?? "#f59e0b")
  const [dmName, setDmName] = useState(sessionName)
  const [dmCharacterName, setDmCharacterName] = useState(sessionCharacterName ?? "")
  const [playerShadowColor, setPlayerShadowColor] = useState(sessionShadowColor ?? "#78716c")
  const [playerName, setPlayerName] = useState(sessionName)
  const [playerCharacterName, setPlayerCharacterName] = useState(sessionCharacterName ?? "")
  const [playerPortraitUrl, setPlayerPortraitUrl] = useState(sessionPortraitUrl ?? "")
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [showThemeManager, setShowThemeManager] = useState(false)
  const [backgroundList, setBackgroundList] = useState(backgrounds)

  const [currentParticleEffect, setCurrentParticleEffect] = useState<ParticleEffect>("none")

  const videoRoomApiRef = useRef<{
    broadcastBackground: (backgroundId: string, background: Background) => void
    broadcastSoundtrack: (soundtrackId: string, soundtrack: Soundtrack) => void
    broadcastVolume: (volume: number) => void
    broadcastParticleEffect: (effect: ParticleEffect) => void
    broadcastChatMessage: (msg: ChatMessage) => void
  } | null>(null)

  // Keep audio volume in sync when track or soundtrack changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume, currentTrackIndex, currentSoundtrack])

  function handleTrackEnded() {
    if (!currentSoundtrack?.trackUrls.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentSoundtrack.trackUrls.length)
  }

  function handlePlayPause() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) { audio.play(); setIsPlaying(true) }
    else { audio.pause(); setIsPlaying(false) }
  }

  function handleNextTrack() {
    if (!currentSoundtrack?.trackUrls.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentSoundtrack.trackUrls.length)
    setIsPlaying(true)
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    if (isAdmin) videoRoomApiRef.current?.broadcastVolume(v)
  }

  async function handleSoundtrackBroadcast(soundtrackId: string) {
    const soundtrack = soundtrackList.find((s) => s.id === soundtrackId)
    if (!soundtrack) return
    await fetch("/api/room/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundtrackId }),
    })
    videoRoomApiRef.current?.broadcastSoundtrack(soundtrackId, soundtrack)
    setCurrentSoundtrack(soundtrack)
    setCurrentTrackIndex(0)
    setIsPlaying(true)
  }

  function handleSoundtrackReceived(_id: string, soundtrack: Soundtrack) {
    setCurrentSoundtrack(soundtrack)
    setCurrentTrackIndex(0)
    setIsPlaying(true)
  }

  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((msgs: ChatMessage[]) => setChatMessages(msgs))
      .catch(() => {})
  }, [])

  function handleChatMessage(msg: ChatMessage) {
    setChatMessages((prev) => [...prev, msg])
  }

  async function handleChatSend(content: string) {
    const characterName = isAdmin ? dmCharacterName : playerCharacterName
    const shadowColor = isAdmin ? dmShadowColor : playerShadowColor
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, characterName, shadowColor }),
    })
    if (res.ok) {
      const msg = (await res.json()) as ChatMessage
      setChatMessages((prev) => [...prev, msg])
      videoRoomApiRef.current?.broadcastChatMessage(msg)
    }
  }

  const [hasJoined, setHasJoined] = useState(false)
  const [joinTimedOut, setJoinTimedOut] = useState(false)

  useEffect(() => {
    if (isAdmin || isLive || !hasJoined) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/room/status")
        if (res.ok) {
          const data = await res.json()
          if (data.isLive) setIsLive(true)
        }
      } catch {}
    }, 3000)

    const timeout = setTimeout(() => {
      setJoinTimedOut(true)
      setHasJoined(false)
    }, 120_000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isAdmin, isLive, hasJoined])

  const handleDmJoined = useCallback(async () => {
    await fetch("/api/room/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLive: true }),
    })
    setIsLive(true)
  }, [])

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

  async function handleBackgroundBroadcast(backgroundId: string) {
    const background = backgroundList.find((b) => b.id === backgroundId)
    if (!background) return

    await fetch("/api/room/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backgroundId }),
    })

    videoRoomApiRef.current?.broadcastBackground(backgroundId, background)
    setCurrentBackgroundId(backgroundId)
    setCurrentBackground(background)
  }

  function handleBackgroundReceived(backgroundId: string, background: Background) {
    setCurrentBackgroundId(backgroundId)
    setCurrentBackground(background)
  }

  function handleParticleEffectBroadcast(effect: ParticleEffect) {
    videoRoomApiRef.current?.broadcastParticleEffect(effect)
    setCurrentParticleEffect(effect)
  }

  function handleParticleEffectReceived(effect: ParticleEffect) {
    setCurrentParticleEffect(effect)
  }

  if (!devMode && !isAdmin && !isLive) {
    const portrait = sessionPortraitId ? (
      <div className='w-32 h-32 rounded-full overflow-hidden border-4 border-amber-500/50 shadow-lg shadow-amber-500/20'>
        <Image
          src={`/portraits/${sessionPortraitId}`}
          alt={sessionCharacterName ?? sessionName}
          width={128}
          height={128}
          className='object-cover w-full h-full'
        />
      </div>
    ) : (
      <div className='w-32 h-32 rounded-full bg-stone-800 border-4 border-amber-500/50 flex items-center justify-center'>
        <span className='text-5xl text-stone-500 font-serif'>
          {(sessionCharacterName ?? sessionName)?.[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
    )

    if (hasJoined) {
      return (
        <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6'>
          {portrait}
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
      <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6'>
        {portrait}
        <div className='text-center space-y-2'>
          <h2 className='text-xl font-serif text-amber-400'>
            {sessionCharacterName ?? sessionName}
          </h2>
          <p className='text-stone-400 text-sm'>Ready to enter Unity Halls</p>
        </div>

        {joinTimedOut && (
          <div className='bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 max-w-xs text-center'>
            <p className='text-red-300 text-sm font-medium'>
              Session not available
            </p>
            <p className='text-red-400/80 text-xs mt-1'>
              The DM hasn&apos;t opened the room yet. Try again later.
            </p>
          </div>
        )}

        <div className='flex items-center gap-3'>
          <button
            onClick={() => {
              setJoinTimedOut(false)
              setHasJoined(true)
            }}
            className='px-8 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors shadow-lg shadow-amber-600/20'
          >
            Join Session
          </button>
          <button
            onClick={() => router.push("/customize")}
            className='px-6 py-3 rounded-lg border border-stone-600 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 font-medium text-sm transition-colors'
          >
            Customize
          </button>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className='px-4 py-2 text-sm text-stone-400 hover:text-stone-100 border border-stone-700 hover:border-stone-500 rounded-lg transition-colors'
        >
          Log out
        </button>
      </main>
    )
  }

  return (
    <main className='h-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden'>
      <header className='flex-none border-b border-stone-800/50 bg-stone-950/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between'>
        <span className='font-serif text-amber-400 text-lg'>Unity Halls</span>
        <div className='flex items-center gap-3 text-xs text-stone-400'>
          {currentBackground && (
            <span className='text-amber-300/70 font-serif'>
              {currentBackground.name}
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

      <div className='flex-1 relative overflow-hidden'>
        {currentBackground?.backgroundUrl && (
          <div
            className='absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out'
            style={{ backgroundImage: `url(${currentBackground.backgroundUrl})` }}
          >
            <div className='absolute inset-0 bg-stone-950/60' />
          </div>
        )}

        <div className='absolute inset-0 z-5 pointer-events-none'>
          <ParticleOverlay effect={currentParticleEffect} />
        </div>

        <div className='relative z-10 h-full'>
          <VideoRoom
            sessionEmail={sessionEmail}
            sessionName={isAdmin ? dmName : playerName}
            sessionCharacterName={
              isAdmin ? dmCharacterName || undefined : playerCharacterName || undefined
            }
            sessionPortraitId={sessionPortraitId}
            sessionPortraitUrl={isAdmin ? sessionPortraitUrl : playerPortraitUrl || undefined}
            sessionPlayerClass={sessionPlayerClass}
            sessionSeatIndex={sessionSeatIndex}
            sessionShadowColor={isAdmin ? dmShadowColor : playerShadowColor}
            isAdmin={isAdmin}
            currentBackground={currentBackground}
            onBackgroundChange={handleBackgroundReceived}
            onSoundtrackChange={handleSoundtrackReceived}
            onParticleEffectChange={handleParticleEffectReceived}
            onVolumeReceived={(v) => {
              setVolume(v)
              if (audioRef.current) audioRef.current.volume = v
            }}
            onDmJoined={handleDmJoined}
            onLeave={handleLeave}
            onChatMessage={handleChatMessage}
            roomStateRef={videoRoomApiRef}
            devMode={devMode}
          />
        </div>
      </div>

      {/* Audio player — loops through active soundtrack */}
      {currentSoundtrack && currentSoundtrack.trackUrls.length > 0 && (
        <audio
          ref={audioRef}
          key={`${currentSoundtrack.id}-${currentTrackIndex}`}
          src={currentSoundtrack.trackUrls[currentTrackIndex]}
          autoPlay={isPlaying}
          onEnded={handleTrackEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className='hidden'
        />
      )}

      {isAdmin && (
        <>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='fixed top-16 right-4 z-50 bg-stone-900/90 border border-amber-900/50 rounded-lg p-2 text-amber-400 hover:text-amber-300 hover:bg-stone-800/90 transition-colors backdrop-blur-sm'
            title='DM Controls'
          >
            {sidebarOpen ? (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
              </svg>
            ) : (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M4 6h16M4 12h16M4 18h16' />
              </svg>
            )}
          </button>

          <aside
            className={`fixed top-0 right-0 h-full w-80 bg-stone-950/95 border-l border-stone-800 backdrop-blur-sm z-40 flex flex-col transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Spacer so content clears the toggle button */}
            <div className='h-14 flex-none' />
            <div className='flex-1 min-h-0'>
              <DmPanel
                backgrounds={backgroundList}
                currentBackgroundId={currentBackgroundId}
                onBackgroundSelect={handleBackgroundBroadcast}
                soundtracks={soundtrackList}
                currentSoundtrackId={currentSoundtrack?.id ?? null}
                onSoundtrackSelect={handleSoundtrackBroadcast}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNextTrack={handleNextTrack}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                currentTrackIndex={currentTrackIndex}
                totalTracks={currentSoundtrack?.trackUrls.length ?? 0}
                currentParticleEffect={currentParticleEffect}
                onParticleEffectSelect={handleParticleEffectBroadcast}
                name={sessionName}
                characterName={sessionCharacterName ?? ""}
                shadowColor={dmShadowColor}
                onShadowColorChange={async (color: string) => {
                  setDmShadowColor(color)
                  await fetch("/api/users/shadow-color", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ shadowColor: color }),
                  })
                }}
                onProfileUpdated={(profile: { name: string; characterName: string }) => {
                  setDmName(profile.name)
                  setDmCharacterName(profile.characterName)
                }}
                onOpenPlayerManager={() => setShowPlayerManager(true)}
                onOpenBackgroundManager={() => setShowThemeManager(true)}
              />
            </div>
          </aside>
        </>
      )}

      {!isAdmin && (
        <>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='fixed top-16 right-4 z-50 bg-stone-900/90 border border-stone-700 rounded-lg p-2 text-stone-300 hover:text-amber-300 hover:bg-stone-800/90 transition-colors backdrop-blur-sm'
            title='My Character'
          >
            {sidebarOpen ? (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
              </svg>
            ) : (
              <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' />
              </svg>
            )}
          </button>

          <aside
            className={`fixed top-0 right-0 h-full w-72 bg-stone-950/95 border-l border-stone-800 backdrop-blur-sm z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className='p-4 pt-16'>
              <PlayerControls
                name={playerName}
                characterName={playerCharacterName}
                shadowColor={playerShadowColor}
                portraitUrl={playerPortraitUrl}
                onProfileUpdated={(profile) => {
                  setPlayerName(profile.name)
                  setPlayerCharacterName(profile.characterName)
                  setPlayerShadowColor(profile.shadowColor)
                  setPlayerPortraitUrl(profile.portraitUrl)
                }}
              />
            </div>
          </aside>
        </>
      )}

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className='fixed bottom-20 left-4 z-50 bg-stone-900/90 border border-stone-700 rounded-xl p-3 text-stone-300 hover:text-amber-300 hover:bg-stone-800/90 transition-colors backdrop-blur-sm'
        title='Toggle chat'
      >
        <svg xmlns='http://www.w3.org/2000/svg' className='w-7 h-7' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
          <path strokeLinecap='round' strokeLinejoin='round' d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.84L3 20l1.09-3.27A7.93 7.93 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' />
        </svg>
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-96 bg-stone-950/95 border-r border-stone-800 backdrop-blur-sm z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          chatOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className='flex-none px-4 pt-4 pb-2 border-b border-stone-800 flex items-center justify-between'>
          <h2 className='font-serif text-amber-400 text-sm'>Session Chat</h2>
          <button onClick={() => setChatOpen(false)} className='text-stone-500 hover:text-stone-300'>
            <svg xmlns='http://www.w3.org/2000/svg' className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
              <path strokeLinecap='round' strokeLinejoin='round' d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>
        <div className='flex-1 min-h-0'>
          <Chat messages={chatMessages} onSend={handleChatSend} />
        </div>
      </aside>

      {showPlayerManager && (
        <PlayerManager onClose={() => setShowPlayerManager(false)} />
      )}

      {showThemeManager && (
        <ThemeManager
          onClose={() => setShowThemeManager(false)}
          onBackgroundsChanged={setBackgroundList}
        />
      )}
    </main>
  )
}
