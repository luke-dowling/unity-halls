import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RoomClient from "./RoomClient"

export default async function RoomPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const roomState = await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", themeId: "tavern", isLive: false },
    update: {},
    include: { theme: true },
  })

  const themes = await prisma.theme.findMany({ orderBy: { name: "asc" } })

  const isAdmin = session.user.role === "DM"

  return (
    <RoomClient
      sessionEmail={session.user.email}
      sessionName={session.user.name}
      sessionCharacterName={session.user.characterName}
      sessionPortraitId={session.user.portraitId}
      sessionPlayerClass={session.user.playerClass}
      sessionSeatIndex={session.user.seatIndex}
      isAdmin={isAdmin}
      initialThemeId={roomState.themeId ?? "tavern"}
      initialTheme={roomState.theme}
      initialIsLive={roomState.isLive}
      themes={themes}
    />
  )
}
