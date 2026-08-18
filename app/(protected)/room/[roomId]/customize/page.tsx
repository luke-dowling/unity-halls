import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import CustomizeClient from "./CustomizeClient"

export default async function CustomizePage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { roomId } = await params

  const membership = await prisma.roomMembership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId } },
  })
  if (!membership) redirect(`/room/${roomId}`)

  return (
    <CustomizeClient
      roomId={roomId}
      characterName={membership.characterName ?? ""}
      portraitUrl={membership.portraitUrl ?? ""}
      shadowColor={membership.shadowColor ?? "#78716c"}
    />
  )
}
