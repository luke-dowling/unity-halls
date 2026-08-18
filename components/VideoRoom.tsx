"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import DailyIframe, {
  DailyCall,
  DailyParticipant,
  DailyEventObjectAppMessage,
} from "@daily-co/daily-js"
import VideoTile from "@/components/VideoTile"
import ScreenShareAnnotation, {
  type Stroke,
} from "@/components/ScreenShareAnnotation"
import type { ParticleEffect } from "@/components/ParticleOverlay"

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

interface ParticipantMeta {
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  name?: string
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

export interface ChatMessagePayload {
  id: string
  characterName?: string | null
  shadowColor?: string | null
  content: string
  createdAt: string
}

type AppMessage =
  | {
      type: "IDENTITY"
      name?: string
      portraitId?: string
      portraitUrl?: string
      characterName?: string
      playerClass?: string
      seatIndex?: number
      isDm?: boolean
      shadowColor?: string
    }
  | { type: "BACKGROUND_COLOR_CHANGE"; backgroundColor: string }
  | {
      type: "SOUNDTRACK_CHANGE"
      soundtrackId: string
      soundtrack: Soundtrack
      startTrackIndex?: number
    }
  | { type: "VOLUME_CHANGE"; volume: number }
  | { type: "PARTICLE_EFFECT_CHANGE"; effect: ParticleEffect }
  | { type: "DRAW_STROKE"; stroke: Stroke }
  | { type: "DRAW_CLEAR" }
  | ({ type: "CHAT_MESSAGE" } & ChatMessagePayload)

interface VideoRoomProps {
  roomId: string
  sessionEmail: string
  sessionName?: string
  sessionCharacterName?: string
  sessionPortraitId?: string
  sessionPortraitUrl?: string
  sessionPlayerClass?: string
  sessionSeatIndex?: number
  sessionShadowColor?: string
  isAdmin: boolean
  onBackgroundColorChange?: (backgroundColor: string) => void
  onSoundtrackChange?: (
    soundtrackId: string,
    soundtrack: Soundtrack,
    startTrackIndex?: number,
  ) => void
  onParticleEffectChange?: (effect: ParticleEffect) => void
  onDmJoined?: () => void
  onLeave?: () => void
  onVolumeReceived?: (volume: number) => void
  onChatMessage?: (msg: ChatMessagePayload) => void
  roomStateRef?: React.MutableRefObject<{
    broadcastBackgroundColor: (backgroundColor: string) => void
    broadcastSoundtrack: (
      soundtrackId: string,
      soundtrack: Soundtrack,
      startTrackIndex?: number,
    ) => void
    broadcastVolume: (volume: number) => void
    broadcastParticleEffect: (effect: ParticleEffect) => void
    broadcastChatMessage: (msg: ChatMessagePayload) => void
  } | null>
  devMode?: boolean
  musicAudioRef?: React.RefObject<HTMLAudioElement | null>
  musicVolume?: number
  // Identifies which track is currently loaded into musicAudioRef (e.g.
  // `${soundtrackId}-${trackIndex}`). The <audio> element remounts on every
  // track change, so this changing signals the recording graph to
  // re-subscribe its "playing" listener to the fresh element.
  musicTrackKey?: string
}

// An HTMLAudioElement with captureStream() — supported by browsers but not
// yet part of TypeScript's DOM lib.
type CaptureableAudioElement = HTMLAudioElement & {
  captureStream?: () => MediaStream
}

const DEFAULT_SHADOW = "#78716c"
const DM_DEFAULT_SHADOW = "#f59e0b"
const MUSIC_SOURCE_KEY = "__music__"
const RECORDING_CANVAS_WIDTH = 1280
const RECORDING_CANVAS_HEIGHT = 720
const RECORDING_MIC_GAIN = 0.5

const DEV_MOCK_PARTICIPANTS: [string, ParticipantMeta][] = [
  [
    "dev-dm",
    {
      videoTrack: null,
      audioTrack: null,
      name: "Luke",
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
  // [
  //   "dev-p1",
  //   {
  //     videoTrack: null,
  //     audioTrack: null,
  //     name: "Alice",
  //     characterName: "Aelric",
  //     playerClass: "CLERIC",
  //     seatIndex: 1,
  //     isDm: false,
  //     isLocal: false,
  //     isMuted: false,
  //     isVideoOff: true,
  //     shadowColor: "#ffffff",
  //   },
  // ],
  [
    "dev-p2",
    {
      videoTrack: null,
      audioTrack: null,
      name: "Bob",
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
      name: "Charlie",
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
      name: "Diana",
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
      name: "Eve",
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
  roomId,
  sessionName,
  sessionCharacterName,
  sessionPortraitId,
  sessionPortraitUrl,
  sessionPlayerClass,
  sessionSeatIndex,
  sessionShadowColor,
  isAdmin,
  onBackgroundColorChange,
  onSoundtrackChange,
  onParticleEffectChange,
  onVolumeReceived,
  onChatMessage,
  onDmJoined,
  onLeave,
  roomStateRef,
  devMode,
  musicAudioRef,
  musicVolume,
  musicTrackKey,
}: VideoRoomProps) {
  const router = useRouter()
  const callRef = useRef<DailyCall | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
  const [participants, setParticipants] = useState<
    Map<string, ParticipantMeta>
  >(new Map())
  const participantsRef = useRef<Map<string, ParticipantMeta>>(new Map())
  const [status, setStatus] = useState<
    "idle" | "joining" | "joined" | "error" | "left"
  >("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [isBlurOn, setIsBlurOn] = useState(false)
  const [supportsBlur, setSupportsBlur] = useState(false)
  const [participantVolumes, setParticipantVolumes] = useState<
    Record<string, number>
  >({})
  const [screenShare, setScreenShare] = useState<{
    sessionId: string
    track: MediaStreamTrack
  } | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const isRecordingRef = useRef(false)
  const recordingStopResolveRef = useRef<(() => void) | null>(null)
  const recordingBlobPartsRef = useRef<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const recordingRafRef = useRef<number | null>(null)
  const recordingAudioCtxRef = useRef<AudioContext | null>(null)
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(
    null,
  )
  const recordingAudioSourcesRef = useRef<
    Map<string, { source: MediaStreamAudioSourceNode; track: MediaStreamTrack }>
  >(new Map())
  const recordingVideoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const recordingMusicGainRef = useRef<GainNode | null>(null)
  const recordingMicGainRef = useRef<GainNode | null>(null)

  // Sort tiles: DM first (seat 0), then by seatIndex
  const tiles = Array.from(participants.entries()).sort(([, a], [, b]) => {
    if (a.isDm) return -1
    if (b.isDm) return 1
    return (a.seatIndex ?? 99) - (b.seatIndex ?? 99)
  })

  const totalTiles = tiles.length

  // Optimal grid layout per participant count
  const { gridCols, gridRows, colSpans } = useMemo(() => {
    const n = totalTiles
    if (n <= 1) return { gridCols: 1, gridRows: 1, colSpans: [] as string[] }
    if (n === 2) return { gridCols: 2, gridRows: 1, colSpans: [] as string[] }
    if (n === 3)
      return {
        gridCols: 4,
        gridRows: 2,
        colSpans: ["1 / 3", "3 / 5", "2 / 4"],
      }
    if (n === 4) return { gridCols: 2, gridRows: 2, colSpans: [] as string[] }
    if (n === 5)
      return {
        gridCols: 6,
        gridRows: 2,
        // Top 3 tiles fill equal thirds; bottom 2 are the same width, centred (cols 1 & 6 stay empty)
        colSpans: ["1 / 3", "3 / 5", "5 / 7", "2 / 4", "4 / 6"],
      }
    return { gridCols: 3, gridRows: 2, colSpans: [] as string[] }
  }, [totalTiles])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("unity_halls_volumes")
      if (stored)
        setParticipantVolumes(JSON.parse(stored) as Record<string, number>)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        "unity_halls_volumes",
        JSON.stringify(participantVolumes),
      )
    } catch {
      /* ignore */
    }
  }, [participantVolumes])

  function setParticipantVolume(characterName: string, vol: number) {
    setParticipantVolumes((prev) => ({ ...prev, [characterName]: vol }))
  }

  const broadcastIdentity = useCallback(
    (call: DailyCall) => {
      call.sendAppMessage({
        type: "IDENTITY",
        name: sessionName,
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
      sessionName,
      sessionPortraitId,
      sessionPortraitUrl,
      sessionCharacterName,
      sessionPlayerClass,
      sessionSeatIndex,
      sessionShadowColor,
      isAdmin,
    ],
  )

  const broadcastBackgroundColor = useCallback((backgroundColor: string) => {
    callRef.current?.sendAppMessage({
      type: "BACKGROUND_COLOR_CHANGE",
      backgroundColor,
    })
  }, [])

  const broadcastSoundtrack = useCallback(
    (
      soundtrackId: string,
      soundtrack: Soundtrack,
      startTrackIndex?: number,
    ) => {
      callRef.current?.sendAppMessage({
        type: "SOUNDTRACK_CHANGE",
        soundtrackId,
        soundtrack,
        startTrackIndex,
      })
    },
    [],
  )

  const broadcastVolume = useCallback((volume: number) => {
    callRef.current?.sendAppMessage({ type: "VOLUME_CHANGE", volume })
  }, [])

  const broadcastParticleEffect = useCallback((effect: ParticleEffect) => {
    callRef.current?.sendAppMessage({ type: "PARTICLE_EFFECT_CHANGE", effect })
  }, [])

  const broadcastStroke = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke])
    callRef.current?.sendAppMessage({ type: "DRAW_STROKE", stroke })
  }, [])

  const broadcastClear = useCallback(() => {
    setStrokes([])
    callRef.current?.sendAppMessage({ type: "DRAW_CLEAR" })
  }, [])

  const broadcastChatMessage = useCallback((msg: ChatMessagePayload) => {
    callRef.current?.sendAppMessage({ type: "CHAT_MESSAGE", ...msg })
  }, [])

  // Expose broadcast helpers to parent via ref
  useEffect(() => {
    if (roomStateRef) {
      roomStateRef.current = {
        broadcastBackgroundColor,
        broadcastSoundtrack,
        broadcastVolume,
        broadcastParticleEffect,
        broadcastChatMessage,
      }
    }
  }, [
    roomStateRef,
    broadcastBackgroundColor,
    broadcastSoundtrack,
    broadcastVolume,
    broadcastParticleEffect,
    broadcastChatMessage,
  ])

  const buildParticipantMeta = (
    p: DailyParticipant,
    isLocal: boolean,
  ): ParticipantMeta => ({
    videoTrack: p.tracks.video?.persistentTrack ?? null,
    audioTrack: p.tracks.audio?.persistentTrack ?? null,
    name: isLocal ? sessionName : undefined,
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

  async function toggleBlur() {
    if (!callRef.current) return
    const next = !isBlurOn
    await callRef.current.updateInputSettings({
      video: {
        processor: next
          ? { type: "background-blur", config: { strength: 0.5 } }
          : { type: "none" },
      },
    })
    setIsBlurOn(next)
  }

  function toggleMic() {
    const newState = !isMicOn
    if (callRef.current) callRef.current.setLocalAudio(newState)
    setIsMicOn(newState)
  }

  // Update local participant's identity immediately when props change
  useEffect(() => {
    setParticipants((prev) => {
      const next = new Map(prev)
      for (const [sid, meta] of next) {
        if (meta.isLocal) {
          next.set(sid, {
            ...meta,
            name: sessionName,
            characterName: sessionCharacterName,
            portraitUrl: sessionPortraitUrl,
            shadowColor: sessionShadowColor,
          })
          break
        }
      }
      return next
    })
    if (callRef.current) broadcastIdentity(callRef.current)
  }, [
    sessionName,
    sessionCharacterName,
    sessionPortraitUrl,
    sessionShadowColor,
    broadcastIdentity,
  ])

  function toggleCam() {
    const newState = !isCamOn
    if (callRef.current) callRef.current.setLocalVideo(newState)
    setIsCamOn(newState)
  }

  function toggleScreenShare() {
    if (!callRef.current) return
    if (isScreenSharing) {
      callRef.current.stopScreenShare()
      setIsScreenSharing(false)
    } else {
      try {
        callRef.current.startScreenShare()
        setIsScreenSharing(true)
      } catch {
        // user cancelled or permission denied
      }
    }
  }

  useEffect(() => {
    const el = screenVideoRef.current
    if (!el) return
    if (screenShare?.track) {
      el.srcObject = new MediaStream([screenShare.track])
    } else {
      el.srcObject = null
    }
  }, [screenShare?.track])

  // Clear annotations when screen share ends
  useEffect(() => {
    if (!screenShare) setStrokes([])
  }, [screenShare])

  function downloadRecording(blob: Blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    a.href = url
    a.download = `unity-halls-session-${stamp}.webm`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function pickRecordingMimeType(): string {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ]
    return (
      candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm"
    )
  }

  // Adds/updates/removes per-participant audio+video sources in the
  // recording graph to track who's currently in the call.
  function syncRecordingGraph(current: Map<string, ParticipantMeta>) {
    const ctx = recordingAudioCtxRef.current
    const dest = recordingDestRef.current
    if (!ctx || !dest) return
    const audioMap = recordingAudioSourcesRef.current
    const videoMap = recordingVideoElsRef.current

    let micGain = recordingMicGainRef.current
    if (!micGain) {
      micGain = ctx.createGain()
      micGain.gain.value = RECORDING_MIC_GAIN
      micGain.connect(dest)
      recordingMicGainRef.current = micGain
    }

    for (const [sid, meta] of current) {
      const existingAudio = audioMap.get(sid)
      if (meta.audioTrack && existingAudio?.track !== meta.audioTrack) {
        existingAudio?.source.disconnect()
        const source = ctx.createMediaStreamSource(
          new MediaStream([meta.audioTrack]),
        )
        source.connect(micGain)
        audioMap.set(sid, { source, track: meta.audioTrack })
      } else if (!meta.audioTrack && existingAudio) {
        existingAudio.source.disconnect()
        audioMap.delete(sid)
      }

      let videoEl = videoMap.get(sid)
      if (!videoEl) {
        videoEl = document.createElement("video")
        videoEl.muted = true
        videoEl.playsInline = true
        videoMap.set(sid, videoEl)
      }
      if (meta.videoTrack) {
        const current = videoEl.srcObject as MediaStream | null
        if (!current || current.getVideoTracks()[0] !== meta.videoTrack) {
          videoEl.srcObject = new MediaStream([meta.videoTrack])
          videoEl.play().catch(() => {})
        }
      } else if (videoEl.srcObject) {
        videoEl.srcObject = null
      }
    }

    for (const sid of Array.from(videoMap.keys())) {
      if (!current.has(sid)) {
        videoMap.get(sid)?.pause()
        videoMap.delete(sid)
        audioMap.get(sid)?.source.disconnect()
        audioMap.delete(sid)
      }
    }
  }

  // Redraws the composited grid of participant tiles onto the recording
  // canvas every frame while a recording is in progress.
  function drawRecordingFrame() {
    const canvas = recordingCanvasRef.current
    const ctx2d = canvas?.getContext("2d")
    if (!canvas || !ctx2d) return

    const entries = Array.from(participantsRef.current.entries())
    const n = Math.max(entries.length, 1)
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const cellW = canvas.width / cols
    const cellH = canvas.height / rows

    ctx2d.fillStyle = "#0c0a09"
    ctx2d.fillRect(0, 0, canvas.width, canvas.height)

    entries.forEach(([sid, meta], i) => {
      const x = (i % cols) * cellW
      const y = Math.floor(i / cols) * cellH
      const videoEl = recordingVideoElsRef.current.get(sid)
      if (videoEl && meta.videoTrack && videoEl.readyState >= 2) {
        ctx2d.drawImage(videoEl, x, y, cellW, cellH)
      } else {
        ctx2d.fillStyle = meta.shadowColor ?? "#44403c"
        ctx2d.fillRect(x, y, cellW, cellH)
      }
      ctx2d.strokeStyle = "#1c1917"
      ctx2d.lineWidth = 2
      ctx2d.strokeRect(x, y, cellW, cellH)
      ctx2d.fillStyle = "#fbbf24"
      ctx2d.font = "bold 18px sans-serif"
      ctx2d.fillText(meta.characterName || meta.name || "Unknown", x + 10, y + cellH - 14)
    })

    recordingRafRef.current = requestAnimationFrame(drawRecordingFrame)
  }

  function teardownRecordingGraph() {
    if (recordingRafRef.current !== null) {
      cancelAnimationFrame(recordingRafRef.current)
      recordingRafRef.current = null
    }
    for (const v of recordingVideoElsRef.current.values()) v.pause()
    recordingVideoElsRef.current.clear()
    for (const { source } of recordingAudioSourcesRef.current.values())
      source.disconnect()
    recordingAudioSourcesRef.current.clear()
    recordingMusicGainRef.current?.disconnect()
    recordingMusicGainRef.current = null
    recordingMicGainRef.current?.disconnect()
    recordingMicGainRef.current = null
    recordingDestRef.current = null
    recordingCanvasRef.current = null
    const ctx = recordingAudioCtxRef.current
    recordingAudioCtxRef.current = null
    ctx?.close().catch(() => {})
    mediaRecorderRef.current = null
  }

  // (Re)captures the music element's audio into the recording graph. Called
  // when recording starts, and again whenever the loaded track changes —
  // captureStream() does not reliably keep producing audio once the
  // element's underlying resource is swapped out, so a stale capture must be
  // torn down and replaced rather than reused.
  const captureMusicSource = useCallback(() => {
    const ctx = recordingAudioCtxRef.current
    const dest = recordingDestRef.current
    if (!ctx || !dest) return

    const existing = recordingAudioSourcesRef.current.get(MUSIC_SOURCE_KEY)
    if (existing) {
      existing.source.disconnect()
      recordingAudioSourcesRef.current.delete(MUSIC_SOURCE_KEY)
    }
    recordingMusicGainRef.current?.disconnect()
    recordingMusicGainRef.current = null

    const musicEl = musicAudioRef?.current as CaptureableAudioElement | null
    if (!musicEl?.captureStream) return
    try {
      const musicTrack = musicEl.captureStream().getAudioTracks()[0]
      if (!musicTrack) return
      const source = ctx.createMediaStreamSource(new MediaStream([musicTrack]))
      // captureStream() ignores the <audio> element's .volume, so the
      // DM's volume slider needs its own gain node to reach the mix.
      const gain = ctx.createGain()
      gain.gain.value = musicVolume ?? musicEl.volume
      source.connect(gain)
      gain.connect(dest)
      recordingMusicGainRef.current = gain
      recordingAudioSourcesRef.current.set(MUSIC_SOURCE_KEY, {
        source,
        track: musicTrack,
      })
    } catch (err) {
      console.error("Could not capture soundtrack audio for recording:", err)
    }
  }, [musicAudioRef, musicVolume])

  // Records mic + every participant's audio/video + the local soundtrack
  // element, mixed locally via Web Audio + Canvas — independent of what's
  // actually transmitted over the Daily call, so players never hear the
  // soundtrack twice.
  function startRecording() {
    if (isRecordingRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = RECORDING_CANVAS_WIDTH
    canvas.height = RECORDING_CANVAS_HEIGHT
    recordingCanvasRef.current = canvas

    const ctx = new AudioContext()
    const dest = ctx.createMediaStreamDestination()
    recordingAudioCtxRef.current = ctx
    recordingDestRef.current = dest
    ctx.resume().catch(() => {})

    captureMusicSource()

    syncRecordingGraph(participantsRef.current)

    const canvasStream = canvas.captureStream(30)
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ])

    const mimeType = pickRecordingMimeType()
    const recorder = new MediaRecorder(combined, { mimeType })
    recordingBlobPartsRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingBlobPartsRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const blob = new Blob(recordingBlobPartsRef.current, { type: mimeType })
      recordingBlobPartsRef.current = []
      downloadRecording(blob)
      teardownRecordingGraph()
      recordingStopResolveRef.current?.()
      recordingStopResolveRef.current = null
    }
    mediaRecorderRef.current = recorder
    recorder.start(1000)

    drawRecordingFrame()

    isRecordingRef.current = true
    setIsRecording(true)
  }

  // Stops recording and waits for the final chunk so leaveCall() doesn't
  // tear down the call before the recording has been assembled and saved.
  function stopRecording(): Promise<void> {
    const recorder = mediaRecorderRef.current
    isRecordingRef.current = false
    setIsRecording(false)
    if (!recorder || recorder.state === "inactive") return Promise.resolve()
    const flush = new Promise<void>((resolve) => {
      recordingStopResolveRef.current = resolve
    })
    recorder.stop()
    return Promise.race([
      flush,
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ])
  }

  // Keep the recorded soundtrack loudness in sync with the DM's volume
  // slider while a recording is in progress.
  useEffect(() => {
    if (recordingMusicGainRef.current) {
      recordingMusicGainRef.current.gain.value = musicVolume ?? 0
    }
  }, [musicVolume])

  // Re-capture the music element's audio whenever it actually starts playing
  // a (possibly new) track. The "playing" event only fires once the browser
  // is genuinely decoding the new resource, so — unlike reacting to the
  // soundtrack/track-index props changing — this can't race React's own
  // effect that reloads the <audio> element (or a remount of it), which
  // would otherwise leave the recording wired to a dead captured stream from
  // the previous track.
  useEffect(() => {
    const el = musicAudioRef?.current
    if (!el) return
    const handlePlaying = () => {
      if (isRecordingRef.current) captureMusicSource()
    }
    el.addEventListener("playing", handlePlaying)
    return () => el.removeEventListener("playing", handlePlaying)
  }, [musicAudioRef, musicTrackKey, captureMusicSource])

  useEffect(() => {
    participantsRef.current = participants
    if (isRecordingRef.current) syncRecordingGraph(participants)
  }, [participants])

  async function leaveCall() {
    if (callRef.current) {
      await stopRecording()
      await callRef.current.leave()
      callRef.current.destroy()
      callRef.current = null
    }
    onLeave?.()
    router.push("/dashboard")
  }

  useEffect(() => {
    if (devMode) {
      setStatus("joined")
      const devMap = new Map(DEV_MOCK_PARTICIPANTS)
      // Apply the session user's saved shadow color to the local participant
      for (const [sid, meta] of devMap) {
        if (meta.isLocal && sessionShadowColor) {
          devMap.set(sid, { ...meta, shadowColor: sessionShadowColor })
        }
      }
      setParticipants(devMap)
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
        const res = await fetch(`/api/daily/token?roomId=${roomId}`)
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
          setSupportsBlur(
            DailyIframe.supportedBrowser().supportsVideoProcessing ?? false,
          )

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
          // Detect active screen share
          let found: { sessionId: string; track: MediaStreamTrack } | null =
            null
          for (const [sid, p] of Object.entries(all)) {
            const t = p.tracks.screenVideo
            if (t?.state === "playable" && t.persistentTrack) {
              found = { sessionId: sid, track: t.persistentTrack }
              break
            }
          }
          setScreenShare(found)
          if (!found) setIsScreenSharing(false)
          setParticipants((prev) => {
            const next = new Map<string, ParticipantMeta>()
            for (const [sid, p] of Object.entries(all)) {
              const existing = prev.get(sid)
              next.set(sid, {
                ...buildParticipantMeta(p, p.local),
                name: p.local ? sessionName : existing?.name,
                portraitId: existing?.portraitId,
                portraitUrl: p.local
                  ? sessionPortraitUrl
                  : existing?.portraitUrl,
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
          setScreenShare((prev) =>
            prev?.sessionId === evt.participant.session_id ? null : prev,
          )
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
                  name: msg.name,
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
          } else if (msg.type === "BACKGROUND_COLOR_CHANGE") {
            onBackgroundColorChange?.(msg.backgroundColor)
          } else if (msg.type === "SOUNDTRACK_CHANGE") {
            onSoundtrackChange?.(
              msg.soundtrackId,
              msg.soundtrack,
              msg.startTrackIndex,
            )
          } else if (msg.type === "VOLUME_CHANGE") {
            onVolumeReceived?.(msg.volume)
          } else if (msg.type === "PARTICLE_EFFECT_CHANGE") {
            onParticleEffectChange?.(msg.effect)
          } else if (msg.type === "DRAW_STROKE") {
            setStrokes((prev) => [...prev, msg.stroke])
          } else if (msg.type === "DRAW_CLEAR") {
            setStrokes([])
          } else if (msg.type === "CHAT_MESSAGE") {
            onChatMessage?.({
              id: msg.id,
              characterName: msg.characterName,
              shadowColor: msg.shadowColor,
              content: msg.content,
              createdAt: msg.createdAt,
            })
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

  const sharerMeta = screenShare
    ? participants.get(screenShare.sessionId)
    : null
  const sharerLabel = sharerMeta?.characterName ?? sharerMeta?.name ?? "Someone"

  return (
    <div className='flex flex-col h-full'>
      {screenShare ? (
        <>
          {/* Screen share presenter view */}
          <div className='flex-1 relative bg-black flex items-center justify-center overflow-hidden'>
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className='max-w-full max-h-full object-contain'
            />
            <ScreenShareAnnotation
              isSharer={isScreenSharing}
              strokes={strokes}
              onStroke={broadcastStroke}
              onClear={broadcastClear}
            />
            <div className='absolute top-3 right-16 bg-stone-900/80 text-amber-300 text-sm px-3 py-1 rounded-full'>
              {sharerLabel} is sharing their screen
            </div>
          </div>

          {/* Participant strip */}
          <div className='flex-none flex gap-3 items-end px-4 py-3 bg-stone-950/90 overflow-x-auto border-t border-stone-800/50'>
            {tiles.map(([sid, meta]) => {
              const color = meta.isDm
                ? (meta.shadowColor ?? DM_DEFAULT_SHADOW)
                : (meta.shadowColor ?? DEFAULT_SHADOW)
              return (
                <div key={sid} className='flex-none w-36'>
                  <VideoTile
                    videoTrack={meta.videoTrack}
                    audioTrack={meta.audioTrack}
                    name={meta.name}
                    portraitId={meta.portraitId}
                    portraitUrl={meta.portraitUrl}
                    characterName={meta.characterName}
                    playerClass={meta.playerClass}
                    isDm={meta.isDm}
                    isLocal={meta.isLocal}
                    isMuted={meta.isMuted}
                    isVideoOff={meta.isVideoOff}
                    shadowColor={color}
                    volume={participantVolumes[meta.characterName ?? ""] ?? 1}
                    onVolumeChange={(vol) =>
                      setParticipantVolume(meta.characterName ?? "", vol)
                    }
                    compact
                  />
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Layout: flex-wrap on small containers, even grid on large (Discord-style) */
        <div className='flex-1 min-h-0 p-2 @container'>
          <div
            className='h-full w-full flex flex-wrap @[960px]:grid gap-4'
            style={{
              alignContent: "stretch",
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            }}
          >
            {tiles.map(([sid, meta], index) => {
              const color = meta.isDm
                ? (meta.shadowColor ?? DM_DEFAULT_SHADOW)
                : (meta.shadowColor ?? DEFAULT_SHADOW)
              return (
                <div
                  key={sid}
                  className='min-h-0'
                  style={{
                    flex: "1 1 280px",
                    ...(colSpans[index] ? { gridColumn: colSpans[index] } : {}),
                  }}
                >
                  <VideoTile
                    videoTrack={meta.videoTrack}
                    audioTrack={meta.audioTrack}
                    name={meta.name}
                    portraitId={meta.portraitId}
                    portraitUrl={meta.portraitUrl}
                    characterName={meta.characterName}
                    playerClass={meta.playerClass}
                    isDm={meta.isDm}
                    isLocal={meta.isLocal}
                    isMuted={meta.isMuted}
                    isVideoOff={meta.isVideoOff}
                    shadowColor={color}
                    volume={participantVolumes[meta.characterName ?? ""] ?? 1}
                    onVolumeChange={(vol) =>
                      setParticipantVolume(meta.characterName ?? "", vol)
                    }
                    fill
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom controls bar */}
      <div className='flex-none flex items-center justify-center gap-4 py-4 bg-stone-950/90 backdrop-blur-sm border-t border-stone-800/50'>
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

        {/* Background blur */}
        {supportsBlur && (
          <button
            onClick={toggleBlur}
            className={`p-3 rounded-full transition-colors ${
              isBlurOn
                ? "bg-amber-700 text-white hover:bg-amber-600"
                : "bg-stone-800 text-stone-100 hover:bg-stone-700"
            }`}
            title={isBlurOn ? "Disable background blur" : "Blur background"}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-5 h-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <circle cx='12' cy='12' r='3' />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M3 12h1m16 0h1M12 3v1m0 16v1M5.636 5.636l.707.707m11.314 11.314.707.707M5.636 18.364l.707-.707m11.314-11.314.707-.707'
              />
            </svg>
          </button>
        )}

        {/* Screen share */}
        {!devMode && (
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing
                ? "bg-amber-600 text-white hover:bg-amber-500"
                : "bg-stone-800 text-stone-100 hover:bg-stone-700"
            }`}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-5 h-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              strokeWidth={2}
            >
              <rect x='2' y='3' width='20' height='14' rx='2' />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M8 21h8M12 17v4'
              />
              {isScreenSharing && <line x1='1' y1='1' x2='23' y2='23' />}
            </svg>
          </button>
        )}

        {/* Record session (DM only) */}
        {isAdmin && !devMode && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-colors ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-stone-800 text-stone-100 hover:bg-stone-700"
            }`}
            title={isRecording ? "Stop recording" : "Record session"}
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='w-5 h-5'
              fill='currentColor'
              viewBox='0 0 24 24'
            >
              <circle
                cx='12'
                cy='12'
                r={isRecording ? 6 : 8}
                className={isRecording ? "animate-pulse" : ""}
              />
            </svg>
          </button>
        )}

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
