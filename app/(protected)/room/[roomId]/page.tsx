import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
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

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { roomId } = await params

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { soundtrack: { include: TRACKS_INCLUDE } },
  })
  if (!room) notFound()

  const isAdmin = room.ownerId === session.user.id

  const membership = isAdmin
    ? null
    : await prisma.roomMembership.findUnique({
        where: { userId_roomId: { userId: session.user.id, roomId } },
      })

  if (!isAdmin && (!membership || membership.status !== "ACTIVE")) {
    redirect("/dashboard")
  }

  const rawSoundtracks = await prisma.soundtrack.findMany({
    orderBy: { name: "asc" },
    include: TRACKS_INCLUDE,
  })

  const soundtracks = rawSoundtracks.map(mapSoundtrack)
  const initialSoundtrack = room.soundtrack ? mapSoundtrack(room.soundtrack) : null

  const devMode = process.env.DEV_MODE === "true"

  return (
    <RoomClient
      roomId={roomId}
      sessionEmail={session.user.email}
      sessionName={session.user.name}
      sessionCharacterName={
        (isAdmin ? room.ownerCharacterName : membership?.characterName) ?? undefined
      }
      sessionPortraitId={isAdmin ? undefined : membership?.portraitId ?? undefined}
      sessionPortraitUrl={
        (isAdmin ? room.ownerPortraitUrl : membership?.portraitUrl) ?? undefined
      }
      sessionPlayerClass={isAdmin ? undefined : membership?.playerClass ?? undefined}
      sessionSeatIndex={isAdmin ? undefined : membership?.seatIndex ?? undefined}
      sessionShadowColor={isAdmin ? room.ownerShadowColor : membership?.shadowColor ?? undefined}
      isAdmin={isAdmin}
      inviteToken={isAdmin ? room.inviteToken : undefined}
      initialBackgroundColor={room.backgroundColor}
      initialSoundtrack={initialSoundtrack}
      initialIsLive={room.isLive}
      soundtracks={soundtracks}
      devMode={devMode}
    />
  )
}
