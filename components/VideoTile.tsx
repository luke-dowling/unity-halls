"use client"

import Image from "next/image"

interface VideoTileProps {
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  portraitId?: string
  characterName?: string
  playerClass?: string
  isDm?: boolean
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
  shadowClass?: string
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
  portraitId,
  characterName,
  playerClass,
  isDm = false,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  shadowClass = "shadow-stone-500/40",
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
          className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden border border-stone-700 shadow-lg ${shadowClass} bg-stone-900`}
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
        <div className='absolute -bottom-3 -right-4 w-14 h-14 rounded-full border-2 border-stone-700 bg-stone-900 overflow-hidden shadow-md z-30'>
          {isDm ? (
            <div className='w-full h-full flex items-center justify-center bg-amber-900/80 text-amber-300 text-sm font-bold font-serif'>
              DM
            </div>
          ) : portraitId ? (
            <Image
              src={`/portraits/${portraitId}`}
              alt={characterName ?? "Player"}
              width={56}
              height={56}
              className='object-cover w-full h-full'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center bg-stone-700 text-stone-400 text-sm font-serif'>
              {characterName?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Name & class below the video */}
      <div className='flex flex-col items-center text-center leading-tight'>
        <span className='text-xs font-medium text-amber-300 drop-shadow truncate max-w-full'>
          {characterName ?? "Adventurer"}
          {isLocal && <span className='text-stone-400 ml-1'>(you)</span>}
        </span>
        <span className='text-[10px] text-stone-400 drop-shadow truncate max-w-full'>
          {isDm ? "Dungeon Master" : (CLASS_LABELS[playerClass ?? ""] ?? "")}
        </span>
      </div>
    </div>
  )
}
