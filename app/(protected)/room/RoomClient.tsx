"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

import VideoRoom from "@/components/VideoRoom"
import DmPanel from "@/components/DmPanel"
import PlayerControls from "@/components/PlayerControls"
import ParticleOverlay, {
  type ParticleEffect,
} from "@/components/ParticleOverlay"
import PlayerManager from "@/components/PlayerManager"
import SoundtrackManager from "@/components/SoundtrackManager"
import Chat, { type ChatMessage } from "@/components/Chat"
import Image from "next/image"

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
  initialBackgroundColor: string
  initialSoundtrack: Soundtrack | null
  initialIsLive: boolean
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
  initialBackgroundColor,
  initialSoundtrack,
  initialIsLive,
  soundtracks,
  devMode,
}: RoomClientProps) {
  const router = useRouter()
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState(
    initialBackgroundColor,
  )
  const [currentSoundtrack, setCurrentSoundtrack] = useState<Soundtrack | null>(
    initialSoundtrack,
  )
  const [soundtrackList, setSoundtrackList] = useState(soundtracks)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [volume, setVolume] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLive, setIsLive] = useState(initialIsLive)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dmShadowColor, setDmShadowColor] = useState(
    sessionShadowColor ?? "#f59e0b",
  )
  const [dmName, setDmName] = useState(sessionName)
  const [dmCharacterName, setDmCharacterName] = useState(
    sessionCharacterName ?? "",
  )
  const [playerShadowColor, setPlayerShadowColor] = useState(
    sessionShadowColor ?? "#78716c",
  )
  const [playerName, setPlayerName] = useState(sessionName)
  const [playerCharacterName, setPlayerCharacterName] = useState(
    sessionCharacterName ?? "",
  )
  const [playerPortraitUrl, setPlayerPortraitUrl] = useState(
    sessionPortraitUrl ?? "",
  )
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [showSoundtrackManager, setShowSoundtrackManager] = useState(false)

  const [currentParticleEffect, setCurrentParticleEffect] =
    useState<ParticleEffect>("none")

  const videoRoomApiRef = useRef<{
    broadcastBackgroundColor: (backgroundColor: string) => void
    broadcastSoundtrack: (
      soundtrackId: string,
      soundtrack: Soundtrack,
      startTrackIndex?: number,
    ) => void
    broadcastVolume: (volume: number) => void
    broadcastParticleEffect: (effect: ParticleEffect) => void
    broadcastChatMessage: (msg: ChatMessage) => void
  } | null>(null)

  // Keep audio volume in sync when track or soundtrack changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume, currentTrackIndex, currentSoundtrack])

  function handleTrackEnded() {
    if (!currentSoundtrack?.tracks.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentSoundtrack.tracks.length)
    setIsPlaying(true)
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
    if (!currentSoundtrack?.tracks.length) return
    setCurrentTrackIndex((prev) => (prev + 1) % currentSoundtrack.tracks.length)
    setIsPlaying(true)
  }

  function handleVolumeChange(v: number) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
    if (isAdmin) videoRoomApiRef.current?.broadcastVolume(v)
  }

  async function handleSoundtrackBroadcast(
    soundtrackId: string,
    startTrackIndex = 0,
  ) {
    const soundtrack = soundtrackList.find((s) => s.id === soundtrackId)
    if (!soundtrack) return
    await fetch("/api/room/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soundtrackId }),
    })
    videoRoomApiRef.current?.broadcastSoundtrack(
      soundtrackId,
      soundtrack,
      startTrackIndex,
    )
    setCurrentSoundtrack(soundtrack)
    setCurrentTrackIndex(startTrackIndex)
    setIsPlaying(true)
  }

  function handleSoundtrackReceived(
    _id: string,
    soundtrack: Soundtrack,
    startTrackIndex = 0,
  ) {
    setCurrentSoundtrack(soundtrack)
    setCurrentTrackIndex(startTrackIndex)
    setIsPlaying(true)
  }

  const [chatOpen, setChatOpen] = useState(false)
  const [chatUnread, setChatUnread] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((msgs: ChatMessage[]) => setChatMessages(msgs))
      .catch(() => {})
  }, [])

  function handleChatMessage(msg: ChatMessage) {
    setChatMessages((prev) => [...prev, msg])
    if (!chatOpen) setChatUnread(true)
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

  async function handleBackgroundColorBroadcast(backgroundColor: string) {
    await fetch("/api/room/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backgroundColor }),
    })

    videoRoomApiRef.current?.broadcastBackgroundColor(backgroundColor)
    setCurrentBackgroundColor(backgroundColor)
  }

  function handleBackgroundColorReceived(backgroundColor: string) {
    setCurrentBackgroundColor(backgroundColor)
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
      <header className='flex-none border-b border-stone-800/50 bg-stone-950/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between'>
        <span className='font-serif text-amber-400 text-2xl'>Unity Halls</span>
        <div className='flex items-center gap-4 text-sm text-stone-400'>
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
          <div className='relative'>
            <button
              onClick={() => {
                setChatOpen(!chatOpen)
                setChatUnread(false)
              }}
              className={`p-2 rounded-lg transition-colors ${chatOpen ? "text-amber-300 bg-stone-800" : "text-stone-400 hover:text-amber-300 hover:bg-stone-800/70"}`}
              title='Session Chat'
            >
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
                  d='M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.84L3 20l1.09-3.27A7.93 7.93 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
            </button>
            {chatUnread && !chatOpen && (
              <span className='absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-1 ring-stone-900 pointer-events-none' />
            )}
          </div>
          {isAdmin ? (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${sidebarOpen ? "text-amber-300 bg-stone-800" : "text-amber-400/80 hover:text-amber-300 hover:bg-stone-800/70"}`}
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
          ) : (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${sidebarOpen ? "text-amber-300 bg-stone-800" : "text-stone-400 hover:text-amber-300 hover:bg-stone-800/70"}`}
              title='My Character'
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
                    d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </header>

      <div className='flex-1 flex overflow-hidden'>
        {/* Chat sidebar — left, pushes video area */}
        <aside
          className={`flex-none overflow-hidden transition-all duration-300 ease-in-out bg-stone-950/95 border-r border-stone-800 flex flex-col ${chatOpen ? "w-96" : "w-0"}`}
        >
          <div className='w-96 flex-none px-4 pt-4 pb-2 border-b border-stone-800 flex items-center justify-between'>
            <h2 className='font-serif text-amber-400 text-sm'>Session Chat</h2>
            <button
              onClick={() => setChatOpen(false)}
              className='text-stone-500 hover:text-stone-300'
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
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
          <div className='w-96 flex-1 min-h-0'>
            <Chat messages={chatMessages} onSend={handleChatSend} />
          </div>
        </aside>

        {/* Main video area */}
        <div className='flex-1 relative overflow-hidden'>
          <div
            className='absolute inset-0 transition-colors duration-1000 ease-in-out'
            style={{ backgroundColor: currentBackgroundColor }}
          />

          <div className='absolute inset-0 z-5 pointer-events-none'>
            <ParticleOverlay effect={currentParticleEffect} />
          </div>

          <div className='relative z-10 h-full'>
            <VideoRoom
              sessionEmail={sessionEmail}
              sessionName={isAdmin ? dmName : playerName}
              sessionCharacterName={
                isAdmin
                  ? dmCharacterName || undefined
                  : playerCharacterName || undefined
              }
              sessionPortraitId={sessionPortraitId}
              sessionPortraitUrl={
                isAdmin ? sessionPortraitUrl : playerPortraitUrl || undefined
              }
              sessionPlayerClass={sessionPlayerClass}
              sessionSeatIndex={sessionSeatIndex}
              sessionShadowColor={isAdmin ? dmShadowColor : playerShadowColor}
              isAdmin={isAdmin}
              onBackgroundColorChange={handleBackgroundColorReceived}
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
              musicAudioRef={audioRef}
              musicVolume={volume}
            />
          </div>
        </div>

        {/* DM controls sidebar — right, pushes video area */}
        {isAdmin && (
          <aside
            className={`flex-none overflow-hidden transition-all duration-300 ease-in-out bg-stone-950/95 border-l border-stone-800 flex flex-col ${sidebarOpen ? "w-80" : "w-0"}`}
          >
            <div className='w-80 flex-1 min-h-0'>
              <DmPanel
                currentBackgroundColor={currentBackgroundColor}
                onBackgroundColorChange={handleBackgroundColorBroadcast}
                soundtracks={soundtrackList}
                currentSoundtrackId={currentSoundtrack?.id ?? null}
                onSoundtrackSelect={handleSoundtrackBroadcast}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNextTrack={handleNextTrack}
                volume={volume}
                onVolumeChange={handleVolumeChange}
                currentTrackIndex={currentTrackIndex}
                totalTracks={currentSoundtrack?.tracks.length ?? 0}
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
                onProfileUpdated={(profile: {
                  name: string
                  characterName: string
                }) => {
                  setDmName(profile.name)
                  setDmCharacterName(profile.characterName)
                }}
                onOpenPlayerManager={() => setShowPlayerManager(true)}
                onOpenSoundtrackManager={() => setShowSoundtrackManager(true)}
              />
            </div>
          </aside>
        )}

        {/* Player controls sidebar — right, pushes video area */}
        {!isAdmin && (
          <aside
            className={`flex-none overflow-hidden transition-all duration-300 ease-in-out bg-stone-950/95 border-l border-stone-800 ${sidebarOpen ? "w-72" : "w-0"}`}
          >
            <div className='w-72 h-full overflow-y-auto p-4'>
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
        )}
      </div>

      {/* Audio player — loops through active soundtrack */}
      {currentSoundtrack && currentSoundtrack.tracks.length > 0 && (
        <audio
          ref={audioRef}
          key={`${currentSoundtrack.id}-${currentTrackIndex}`}
          crossOrigin='anonymous'
          src={currentSoundtrack.tracks[currentTrackIndex]?.url}
          autoPlay={isPlaying}
          loop={currentSoundtrack.tracks.length === 1}
          onEnded={handleTrackEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className='hidden'
        />
      )}

      {showPlayerManager && (
        <PlayerManager onClose={() => setShowPlayerManager(false)} />
      )}

      {showSoundtrackManager && (
        <SoundtrackManager
          onClose={() => setShowSoundtrackManager(false)}
          onSoundtracksChanged={setSoundtrackList}
        />
      )}
    </main>
  )
}
