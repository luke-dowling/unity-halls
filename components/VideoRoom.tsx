"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { signOut } from "next-auth/react"
import DailyIframe, {
  DailyCall,
  DailyParticipant,
  DailyEventObjectAppMessage,
} from "@daily-co/daily-js"
import VideoTile from "@/components/VideoTile"

interface Theme {
  id: string
  name: string
  backgroundUrl: string
  musicUrls: string[]
}

interface ParticipantMeta {
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  portraitId?: string
  portraitUrl?: string
  characterName?: string
  playerClass?: string
  seatIndex?: number
  isDm?: boolean
  shadowColor?: string
  isLocal: boolean
  isMuted: boolean
  isVideoOff: boolean
}

type AppMessage =
  | {
      type: "IDENTITY"
      portraitId?: string
      portraitUrl?: string
      characterName?: string
      playerClass?: string
      seatIndex?: number
      isDm?: boolean
      shadowColor?: string
    }
  | { type: "THEME_CHANGE"; themeId: string; theme: Theme }

interface VideoRoomProps {
  sessionEmail: string
  sessionCharacterName?: string
  sessionPortraitId?: string
  sessionPortraitUrl?: string
  sessionPlayerClass?: string
  sessionSeatIndex?: number
  sessionShadowColor?: string
  isAdmin: boolean
  currentTheme: Theme | null
  onThemeChange?: (themeId: string, theme: Theme) => void
  onDmJoined?: () => void
  onLeave?: () => void
  roomStateRef?: React.MutableRefObject<{
    broadcastTheme: (themeId: string, theme: Theme) => void
  } | null>
  devMode?: boolean
}

const DEFAULT_SHADOW = "#78716c"
const DM_DEFAULT_SHADOW = "#f59e0b"

const DEV_MOCK_PARTICIPANTS: [string, ParticipantMeta][] = [
  [
    "dev-dm",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "The DM",
      playerClass: undefined,
      seatIndex: 0,
      isDm: true,
      isLocal: true,
      isMuted: false,
      isVideoOff: true,
      shadowColor: "#f59e0b",
    },
  ],
  [
    "dev-p1",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "Aelric",
      playerClass: "CLERIC",
      seatIndex: 1,
      isDm: false,
      isLocal: false,
      isMuted: false,
      isVideoOff: true,
      shadowColor: "#ffffff",
    },
  ],
  [
    "dev-p2",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "Thornwick",
      playerClass: "RANGER",
      seatIndex: 2,
      isDm: false,
      isLocal: false,
      isMuted: true,
      isVideoOff: true,
      shadowColor: "#22c55e",
    },
  ],
  [
    "dev-p3",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "Morgath",
      playerClass: "BLOOD_HUNTER",
      seatIndex: 3,
      isDm: false,
      isLocal: false,
      isMuted: false,
      isVideoOff: true,
      shadowColor: "#dc2626",
    },
  ],
  [
    "dev-p4",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "Seraphina",
      playerClass: "PALADIN",
      seatIndex: 4,
      isDm: false,
      isLocal: false,
      isMuted: false,
      isVideoOff: true,
      shadowColor: "#facc15",
    },
  ],
  [
    "dev-p5",
    {
      videoTrack: null,
      audioTrack: null,
      characterName: "Zephyr",
      playerClass: "SORCERER",
      seatIndex: 5,
      isDm: false,
      isLocal: false,
      isMuted: false,
      isVideoOff: true,
      shadowColor: "#a855f7",
    },
  ],
]

export default function VideoRoom({
  sessionCharacterName,
  sessionPortraitId,
  sessionPortraitUrl,
  sessionPlayerClass,
  sessionSeatIndex,
  sessionShadowColor,
  isAdmin,
  onThemeChange,
  onDmJoined,
  onLeave,
  roomStateRef,
  devMode,
}: VideoRoomProps) {
  const callRef = useRef<DailyCall | null>(null)
  const [participants, setParticipants] = useState<
    Map<string, ParticipantMeta>
  >(new Map())
  const [status, setStatus] = useState<
    "idle" | "joining" | "joined" | "error" | "left"
  >("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)

  const broadcastIdentity = useCallback(
    (call: DailyCall) => {
      call.sendAppMessage({
        type: "IDENTITY",
        portraitId: sessionPortraitId,
        portraitUrl: sessionPortraitUrl,
        characterName: sessionCharacterName,
        playerClass: sessionPlayerClass,
        seatIndex: sessionSeatIndex,
        isDm: isAdmin,
        shadowColor: sessionShadowColor,
      })
    },
    [
      sessionPortraitId,
      sessionPortraitUrl,
      sessionCharacterName,
      sessionPlayerClass,
      sessionSeatIndex,
      sessionShadowColor,
      isAdmin,
    ],
  )

  const broadcastTheme = useCallback((themeId: string, theme: Theme) => {
    callRef.current?.sendAppMessage({ type: "THEME_CHANGE", themeId, theme })
  }, [])

  // Expose broadcastTheme to parent via ref
  useEffect(() => {
    if (roomStateRef) {
      roomStateRef.current = { broadcastTheme }
    }
  }, [roomStateRef, broadcastTheme])

  const buildParticipantMeta = (
    p: DailyParticipant,
    isLocal: boolean,
  ): ParticipantMeta => ({
    videoTrack: p.tracks.video?.persistentTrack ?? null,
    audioTrack: p.tracks.audio?.persistentTrack ?? null,
    portraitId: isLocal ? sessionPortraitId : undefined,
    portraitUrl: isLocal ? sessionPortraitUrl : undefined,
    characterName: isLocal ? sessionCharacterName : (p.user_name ?? undefined),
    playerClass: isLocal ? sessionPlayerClass : undefined,
    seatIndex: isLocal ? sessionSeatIndex : undefined,
    isDm: isLocal ? isAdmin : undefined,
    shadowColor: isLocal ? sessionShadowColor : undefined,
    isLocal,
    isMuted:
      p.tracks.audio?.state === "off" ||
      p.tracks.audio?.state === "blocked" ||
      false,
    isVideoOff:
      p.tracks.video?.state === "off" ||
      p.tracks.video?.state === "blocked" ||
      false,
  })

  function toggleMic() {
    const newState = !isMicOn
    if (callRef.current) callRef.current.setLocalAudio(newState)
    setIsMicOn(newState)
  }

  // Update local participant's shadow color immediately when prop changes
  useEffect(() => {
    setParticipants((prev) => {
      const next = new Map(prev)
      for (const [sid, meta] of next) {
        if (meta.isLocal) {
          next.set(sid, { ...meta, shadowColor: sessionShadowColor })
          break
        }
      }
      return next
    })
    if (callRef.current) broadcastIdentity(callRef.current)
  }, [sessionShadowColor, broadcastIdentity])

  function toggleCam() {
    const newState = !isCamOn
    if (callRef.current) callRef.current.setLocalVideo(newState)
    setIsCamOn(newState)
  }

  async function leaveCall() {
    if (callRef.current) {
      await callRef.current.leave()
      callRef.current.destroy()
      callRef.current = null
    }
    onLeave?.()
    signOut({ callbackUrl: "/login" })
  }

  useEffect(() => {
    if (devMode) {
      setStatus("joined")
      setParticipants(new Map(DEV_MOCK_PARTICIPANTS))
      if (isAdmin) onDmJoined?.()
      return
    }

    if (callRef.current) {
      callRef.current.destroy()
      callRef.current = null
    }

    let destroyed = false
    let call: DailyCall

    async function join() {
      setStatus("joining")
      try {
        const res = await fetch("/api/daily/token")
        if (!res.ok) throw new Error("Failed to get access token")
        const { token, url } = (await res.json()) as {
          token: string
          url: string
        }

        call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: true,
        })
        if (destroyed) {
          call.destroy()
          return
        }
        callRef.current = call

        call.on("joined-meeting", (evt) => {
          if (!evt) return
          setStatus("joined")

          if (isAdmin) onDmJoined?.()

          const map = new Map<string, ParticipantMeta>()
          const all = call.participants()
          for (const [sid, p] of Object.entries(all)) {
            map.set(sid, buildParticipantMeta(p, p.local))
          }
          setParticipants(new Map(map))
          broadcastIdentity(call)
        })

        call.on("participant-joined", () => {
          broadcastIdentity(call)
          const all = call.participants()
          setParticipants(
            new Map(
              Object.entries(all).map(([sid, p]) => [
                sid,
                buildParticipantMeta(p, p.local),
              ]),
            ),
          )
        })

        call.on("participant-updated", () => {
          const all = call.participants()
          setParticipants((prev) => {
            const next = new Map<string, ParticipantMeta>()
            for (const [sid, p] of Object.entries(all)) {
              const existing = prev.get(sid)
              next.set(sid, {
                ...buildParticipantMeta(p, p.local),
                portraitId: existing?.portraitId,
                portraitUrl: existing?.portraitUrl,
                characterName: p.local
                  ? sessionCharacterName
                  : (existing?.characterName ?? p.user_name ?? undefined),
                playerClass: p.local
                  ? sessionPlayerClass
                  : existing?.playerClass,
                seatIndex: p.local ? sessionSeatIndex : existing?.seatIndex,
                isDm: p.local ? isAdmin : existing?.isDm,
                shadowColor: p.local
                  ? sessionShadowColor
                  : existing?.shadowColor,
              })
            }
            return next
          })
        })

        call.on("participant-left", (evt) => {
          if (!evt) return
          setParticipants((prev) => {
            const next = new Map(prev)
            next.delete(evt.participant.session_id)
            return next
          })
        })

        call.on("app-message", (evt: DailyEventObjectAppMessage) => {
          const msg = evt.data as AppMessage
          const fromId = evt.fromId
          if (msg.type === "IDENTITY") {
            setParticipants((prev) => {
              const next = new Map(prev)
              const entry = next.get(fromId)
              if (entry) {
                next.set(fromId, {
                  ...entry,
                  portraitId: msg.portraitId,
                  portraitUrl: msg.portraitUrl,
                  characterName: msg.characterName,
                  playerClass: msg.playerClass,
                  seatIndex: msg.seatIndex,
                  isDm: msg.isDm,
                  shadowColor: msg.shadowColor,
                })
              }
              return next
            })
          } else if (msg.type === "THEME_CHANGE") {
            onThemeChange?.(msg.themeId, msg.theme)
          }
        })

        call.on("error", (evt) => {
          console.error("Daily error:", evt)
          setErrorMsg("A connection error occurred.")
          setStatus("error")
        })

        await call.join({ url, token })
      } catch (err) {
        console.error("Failed to join:", err)
        setErrorMsg("Could not connect to the video room.")
        setStatus("error")
      }
    }

    join()

    return () => {
      destroyed = true
      call?.leave().then(() => call?.destroy())
      callRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === "idle" || status === "joining") {
    return (
      <div className='flex flex-col items-center justify-center h-64 text-stone-400 gap-3'>
        <div className='w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin' />
        <p className='text-sm'>Connecting to the hall…</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className='flex items-center justify-center h-64 text-red-400'>
        <p>{errorMsg}</p>
      </div>
    )
  }

  if (status === "left") {
    return (
      <div className='flex flex-col items-center justify-center h-64 text-stone-400 gap-3'>
        <p className='text-lg font-serif text-amber-400'>
          You have left the hall
        </p>
        <button
          onClick={() => window.location.reload()}
          className='text-sm text-amber-500 hover:text-amber-400 underline'
        >
          Rejoin
        </button>
      </div>
    )
  }

  // Sort tiles: DM first (seat 0), then by seatIndex
  const tiles = Array.from(participants.entries()).sort(([, a], [, b]) => {
    if (a.isDm) return -1
    if (b.isDm) return 1
    return (a.seatIndex ?? 99) - (b.seatIndex ?? 99)
  })

  const totalTiles = tiles.length

  return (
    <div className='flex flex-col h-full pb-[76px]'>
      {/* Circular layout (desktop) / Grid (mobile) */}
      <div className='flex-1 flex items-center justify-center p-4 pt-18 lg:pt-10'>
        {/* Mobile grid */}
        <div className='grid grid-cols-2 gap-3 md:hidden w-full max-w-lg'>
          {tiles.map(([sid, meta]) => {
            const color = meta.isDm
              ? (meta.shadowColor ?? DM_DEFAULT_SHADOW)
              : (meta.shadowColor ?? DEFAULT_SHADOW)
            return (
              <VideoTile
                key={sid}
                videoTrack={meta.videoTrack}
                audioTrack={meta.audioTrack}
                portraitId={meta.portraitId}
                portraitUrl={meta.portraitUrl}
                characterName={meta.characterName}
                playerClass={meta.playerClass}
                isDm={meta.isDm}
                isLocal={meta.isLocal}
                isMuted={meta.isMuted}
                isVideoOff={meta.isVideoOff}
                shadowColor={color}
              />
            )
          })}
        </div>

        {/* Desktop circular layout */}
        <div
          className='hidden md:block relative'
          style={{ width: "min(85vh, 1200px)", height: "min(65vh, 900px)" }}
        >
          {tiles.map(([sid, meta], index) => {
            const color = meta.isDm
              ? (meta.shadowColor ?? DM_DEFAULT_SHADOW)
              : (meta.shadowColor ?? DEFAULT_SHADOW)

            // Position in circle: DM at top, others distributed evenly
            const angle = (index / totalTiles) * 2 * Math.PI - Math.PI / 2
            const radius = 44 // % from center
            const cx = 50 + radius * Math.cos(angle)
            const cy = 50 + radius * Math.sin(angle)

            return (
              <div
                key={sid}
                className='absolute transform -translate-x-1/2 -translate-y-1/2 w-56 h-20 '
                style={{
                  left: `${cx}%`,
                  top: `${cy}%`,
                }}
              >
                <VideoTile
                  videoTrack={meta.videoTrack}
                  audioTrack={meta.audioTrack}
                  portraitId={meta.portraitId}
                  portraitUrl={meta.portraitUrl}
                  characterName={meta.characterName}
                  playerClass={meta.playerClass}
                  isDm={meta.isDm}
                  isLocal={meta.isLocal}
                  isMuted={meta.isMuted}
                  isVideoOff={meta.isVideoOff}
                  shadowColor={color}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className='fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-4 py-4 bg-stone-950/90 backdrop-blur-sm border-t border-stone-800/50'>
        {/* Mic toggle */}
        <button
          onClick={toggleMic}
          className={`p-3 rounded-full transition-colors ${
            isMicOn
              ? "bg-stone-800 text-stone-100 hover:bg-stone-700"
              : "bg-red-600 text-white hover:bg-red-500"
          }`}
          title={isMicOn ? "Mute microphone" : "Unmute microphone"}
        >
          {isMicOn ? (
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
                d='M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M19 10v2a7 7 0 01-14 0v-2'
              />
              <line x1='12' y1='19' x2='12' y2='23' />
              <line x1='8' y1='23' x2='16' y2='23' />
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
              <line x1='1' y1='1' x2='23' y2='23' />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M17 16.95A7 7 0 015 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49'
              />
              <line x1='12' y1='19' x2='12' y2='23' />
              <line x1='8' y1='23' x2='16' y2='23' />
            </svg>
          )}
        </button>

        {/* Camera toggle */}
        <button
          onClick={toggleCam}
          className={`p-3 rounded-full transition-colors ${
            isCamOn
              ? "bg-stone-800 text-stone-100 hover:bg-stone-700"
              : "bg-red-600 text-white hover:bg-red-500"
          }`}
          title={isCamOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCamOn ? (
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
                d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
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
                d='M15.536 8.464a5 5 0 010 7.072M12 9.636V6a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h1.636'
              />
              <line x1='1' y1='1' x2='23' y2='23' />
            </svg>
          )}
        </button>

        {/* Leave call */}
        <button
          onClick={leaveCall}
          className='p-3 rounded-full bg-red-700 text-white hover:bg-red-600 transition-colors'
          title='Leave call'
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
              d='M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z'
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
