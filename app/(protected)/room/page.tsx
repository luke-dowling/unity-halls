import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RoomClient from "./RoomClient"

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
    include: { background: true, soundtrack: true },
  })

  const [backgrounds, soundtracks] = await Promise.all([
    prisma.background.findMany({ orderBy: { name: "asc" } }),
    prisma.soundtrack.findMany({ orderBy: { name: "asc" } }),
  ])

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
      initialSoundtrack={roomState.soundtrack}
      initialIsLive={roomState.isLive}
      backgrounds={backgrounds}
      soundtracks={soundtracks}
      devMode={devMode}
    />
  )
}
