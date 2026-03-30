"use client"

import Image from "next/image"

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
}: VideoTileProps) {
  function attachVideo(el: HTMLVideoElement | null) {
    if (!el || !videoTrack) return
    const stream = new MediaStream([videoTrack])
    el.srcObject = stream
  }

  function attachAudio(el: HTMLAudioElement | null) {
    if (!el || !audioTrack || isLocal) return
    const stream = new MediaStream([audioTrack])
    el.srcObject = stream
  }

  return (
    <div className='flex flex-col items-center gap-1.5'>
      {/* Video container wrapper — relative so portrait can overflow */}
      <div className='relative w-full'>
        {/* Video frame — rectangular with rounded edges */}
        <div
          className='relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-stone-700 bg-stone-900'
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
        </div>

        {/* Portrait circle — bottom-right, overlapping outside the video frame */}
        <div
          className='absolute -bottom-4 -right-5 lg:-bottom-4 lg:-right-5 w-20 h-20 rounded-full border-2 bg-stone-900 overflow-hidden shadow-md z-30'
          style={{ borderColor: shadowColor }}
        >
          {isDm ? (
            <div className='w-full h-full flex items-center justify-center bg-amber-900/80 text-amber-300 text-base font-bold font-serif'>
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

      {/* Name & class below the video */}
      <div className='flex flex-col items-center text-center leading-tight'>
        <span className='text-xs lg:text-xl font-medium text-amber-300 drop-shadow truncate max-w-full'>
          {characterName ?? "Adventurer"}
          {isLocal && <span className='text-stone-400 ml-1'>(you)</span>}
        </span>
        <span className='text-[10px] lg:text-lg text-stone-400 drop-shadow truncate max-w-full'>
          {isDm ? name : name ? name : (CLASS_LABELS[playerClass ?? ""] ?? "")}
        </span>
      </div>
    </div>
  )
}
