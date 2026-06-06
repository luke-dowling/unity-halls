"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface VideoTileProps {
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  name?: string
  portraitId?: string
  portraitUrl?: string
  characterName?: string
  playerClass?: string
  isDm?: boolean
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
  shadowColor?: string
  volume?: number
  onVolumeChange?: (vol: number) => void
  compact?: boolean
}

const CLASS_LABELS: Record<string, string> = {
  CLERIC: "Cleric",
  RANGER: "Ranger",
  BLOOD_HUNTER: "Blood Hunter",
  PALADIN: "Paladin",
  SORCERER: "Sorcerer",
}

export default function VideoTile({
  videoTrack,
  audioTrack,
  name,
  portraitId,
  portraitUrl,
  characterName,
  playerClass,
  isDm = false,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  shadowColor = "#78716c",
  volume = 1,
  onVolumeChange,
  compact = false,
}: VideoTileProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [showVolume, setShowVolume] = useState(false)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (!audioTrack || isMuted) return

    let ctx: AudioContext
    let animFrame: number
    let smoothed = 0

    try {
      ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]))
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)

      function tick() {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        smoothed = smoothed * 0.85 + rms * 0.15
        const level = Math.min(smoothed * 8, 1)

        const el = frameRef.current
        if (el) {
          const size = 18 + level * 30
          const spread = 4 + level * 12
          const alpha = Math.round((0.6 + level * 0.4) * 255)
            .toString(16)
            .padStart(2, "0")
          el.style.boxShadow = `0 0 ${size}px ${spread}px ${shadowColor}${alpha}`
        }
        animFrame = requestAnimationFrame(tick)
      }

      animFrame = requestAnimationFrame(tick)
      if (ctx.state === "suspended") ctx.resume()
    } catch {
      return
    }

    return () => {
      cancelAnimationFrame(animFrame)
      ctx?.close()
    }
  }, [audioTrack, isMuted, shadowColor])

  function attachVideo(el: HTMLVideoElement | null) {
    if (!el || !videoTrack) return
    const stream = new MediaStream([videoTrack])
    el.srcObject = stream
  }

  function attachAudio(el: HTMLAudioElement | null) {
    audioRef.current = el
    if (!el || !audioTrack || isLocal) return
    const stream = new MediaStream([audioTrack])
    el.srcObject = stream
    el.volume = volume
  }

  return (
    <div className='relative w-full group'>
      {/* Video frame — rectangular with rounded edges */}
      <div
        ref={frameRef}
        className='relative aspect-[4/3] rounded-2xl overflow-hidden border border-stone-700 bg-stone-900'
        style={{ boxShadow: `0 0 18px 4px ${shadowColor}99` }}
      >
        {/* Video */}
        {videoTrack && !isVideoOff ? (
          <video
            ref={attachVideo}
            autoPlay
            playsInline
            muted
            className='absolute inset-0 w-full h-full object-cover'
          />
        ) : (
          /* Fallback: dark bg with initials */
          <div className='absolute inset-0 flex items-center justify-center bg-stone-800'>
            <span className='text-4xl text-stone-500 font-serif'>
              {characterName?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}

        {/* Hidden audio element for remote participants */}
        {!isLocal && <audio ref={attachAudio} autoPlay />}

        {/* Muted indicator — top-right corner */}
        {isMuted && (
          <span
            title='Muted'
            className='absolute top-1.5 right-1.5 text-red-400 text-[10px] font-medium bg-stone-900/80 rounded px-1 z-10'
          >
            🎙️✕
          </span>
        )}

        {/* Volume control — bottom-left, remote tiles only, visible on hover */}
        {!isLocal && (
          <div className={`absolute bottom-1.5 left-1.5 z-20 transition-opacity ${showVolume ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <button
              onClick={() => setShowVolume((v) => !v)}
              className='p-1 rounded bg-stone-900/80 text-stone-300 hover:text-amber-400 transition-colors'
              title='Adjust volume'
            >
              {volume === 0 ? (
                <svg xmlns='http://www.w3.org/2000/svg' className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' />
                  <path strokeLinecap='round' strokeLinejoin='round' d='M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2' />
                </svg>
              ) : (
                <svg xmlns='http://www.w3.org/2000/svg' className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                  <path strokeLinecap='round' strokeLinejoin='round' d='M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z' />
                </svg>
              )}
            </button>
            {showVolume && (
              <div className='absolute bottom-8 left-0 bg-stone-900/95 border border-stone-700 rounded-lg px-2 pt-2 pb-1 shadow-lg flex flex-col items-center gap-1'>
                <input
                  type='range'
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                  className='w-20 accent-amber-500'
                />
                <span className='text-[10px] text-stone-400'>{Math.round(volume * 100)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Name overlay — top-left corner, inside the tile */}
        <div className='absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-2 pt-2 pb-6 pointer-events-none'>
          <p className={`font-medium text-amber-300 drop-shadow truncate leading-tight ${compact ? "text-[9px]" : "text-sm"}`}>
            {characterName ?? "Adventurer"}
            {isLocal && <span className='text-stone-400 font-normal ml-1 text-xs'>(you)</span>}
          </p>
          {!compact && (
            <p className='text-xs text-stone-300/80 drop-shadow truncate leading-tight'>
              {isDm ? name : name ? name : (CLASS_LABELS[playerClass ?? ""] ?? "")}
            </p>
          )}
        </div>
      </div>

      {/* Portrait circle — bottom-right, overlapping outside the video frame */}
      <div
        className={`absolute rounded-full border-2 bg-stone-900 overflow-hidden shadow-md z-30 ${
          compact
            ? "-bottom-2 -right-2 w-12 h-12"
            : "-bottom-4 -right-5 lg:-bottom-4 lg:-right-5 w-20 h-20"
        }`}
        style={{ borderColor: shadowColor }}
      >
        {isDm ? (
          <div className={`w-full h-full flex items-center justify-center bg-amber-900/80 text-amber-300 font-bold font-serif ${compact ? "text-xs" : "text-base"}`}>
            DM
          </div>
        ) : portraitUrl ? (
          <Image
            src={portraitUrl}
            alt={characterName ?? "Player"}
            width={80}
            height={80}
            className='object-cover w-full h-full'
          />
        ) : portraitId ? (
          <Image
            src={`/portraits/${portraitId}`}
            alt={characterName ?? "Player"}
            width={80}
            height={80}
            className='object-cover w-full h-full'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center bg-stone-700 text-stone-400 text-base font-serif'>
            {characterName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
    </div>
  )
}
