"use client"

import Image from "next/image"

interface VideoTileProps {
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
  portraitId?: string
  characterName?: string
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
  circular?: boolean
  shadowClass?: string
}

export default function VideoTile({
  videoTrack,
  audioTrack,
  portraitId,
  characterName,
  isLocal = false,
  isMuted = false,
  isVideoOff = false,
  circular = false,
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

  const shapeClass = circular ? "rounded-full" : "rounded-lg aspect-video"

  return (
    <div
      className={`relative bg-stone-900 overflow-hidden border border-stone-700 shadow-lg ${shadowClass} ${shapeClass} ${circular ? "w-full h-full" : ""}`}
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
        /* Fallback: portrait or initials */
        <div className='absolute inset-0 flex items-center justify-center bg-stone-800'>
          {portraitId ? (
            <Image
              src={`/portraits/${portraitId}`}
              alt={characterName ?? "Player"}
              fill
              className='object-cover opacity-60'
            />
          ) : (
            <span className='text-4xl text-stone-500 font-serif'>
              {characterName?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
      )}

      {/* Hidden audio element for remote participants */}
      {!isLocal && <audio ref={attachAudio} autoPlay />}

      {/* Name overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-stone-950/90 to-transparent px-2 py-1 flex items-end justify-between ${circular ? "rounded-b-full" : ""}`}
      >
        <span className='text-xs font-medium text-amber-300 drop-shadow truncate'>
          {characterName ?? "Adventurer"}
          {isLocal && <span className='text-stone-400 ml-1'>(you)</span>}
        </span>

        {/* Muted indicator */}
        {isMuted && (
          <span
            title='Muted'
            className='text-red-400 text-xs font-medium bg-stone-900/80 rounded px-1'
          >
            🎙️✕
          </span>
        )}
      </div>
    </div>
  )
}
