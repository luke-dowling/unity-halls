import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RoomClient from "./RoomClient"

const TRACKS_INCLUDE = {
  tracks: {
    include: { track: true },
    orderBy: { position: "asc" as const },
  },
} as const

function mapSoundtrack(st: {
  id: string
  name: string
  tracks: { position: number; track: { id: string; name: string; url: string } }[]
}) {
  return {
    id: st.id,
    name: st.name,
    tracks: st.tracks
      .sort((a, b) => a.position - b.position)
      .map((t) => t.track),
  }
}

export default async function RoomPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      characterName: true,
      portraitId: true,
      portraitUrl: true,
      playerClass: true,
      seatIndex: true,
      shadowColor: true,
    },
  })

  const roomState = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", backgroundId: "world-map", isLive: false },
    update: {},
    include: {
      background: true,
      soundtrack: { include: TRACKS_INCLUDE },
    },
  })

  const [backgrounds, rawSoundtracks] = await Promise.all([
    prisma.background.findMany({ orderBy: { name: "asc" } }),
    prisma.soundtrack.findMany({
      orderBy: { name: "asc" },
      include: TRACKS_INCLUDE,
    }),
  ])

  const soundtracks = rawSoundtracks.map(mapSoundtrack)
  const initialSoundtrack = roomState.soundtrack
    ? mapSoundtrack(roomState.soundtrack)
    : null

  const isAdmin = session.user.role === "DM"
  const devMode = process.env.DEV_MODE === "true"

  return (
    <RoomClient
      sessionEmail={session.user.email}
      sessionName={dbUser?.name ?? session.user.name}
      sessionCharacterName={dbUser?.characterName ?? session.user.characterName}
      sessionPortraitId={dbUser?.portraitId ?? session.user.portraitId}
      sessionPortraitUrl={dbUser?.portraitUrl ?? session.user.portraitUrl}
      sessionPlayerClass={dbUser?.playerClass ?? session.user.playerClass}
      sessionSeatIndex={dbUser?.seatIndex ?? session.user.seatIndex}
      sessionShadowColor={dbUser?.shadowColor ?? session.user.shadowColor}
      isAdmin={isAdmin}
      initialBackgroundId={roomState.backgroundId ?? "world-map"}
      initialBackground={roomState.background}
      initialSoundtrack={initialSoundtrack}
      initialIsLive={roomState.isLive}
      backgrounds={backgrounds}
      soundtracks={soundtracks}
      devMode={devMode}
    />
  )
}
