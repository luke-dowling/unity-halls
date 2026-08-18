import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MAX_PLAYER_ROOMS } from "@/lib/rooms"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [ownedRoom, memberships] = await Promise.all([
    prisma.room.findFirst({ where: { ownerId: session.user.id } }),
    prisma.roomMembership.findMany({
      where: { userId: session.user.id },
      include: { room: { include: { owner: { select: { name: true } } } } },
      orderBy: { joinedAt: "desc" },
    }),
  ])

  const pendingCount = ownedRoom
    ? await prisma.roomMembership.count({
        where: { roomId: ownedRoom.id, status: "PENDING" },
      })
    : 0

  function mapMembership(m: (typeof memberships)[number]) {
    return {
      roomId: m.roomId,
      roomName: m.room.name,
      dmName: m.room.owner.name,
      status: m.status,
    }
  }

  return (
    <DashboardClient
      sessionName={session.user.name}
      maxPlayerRooms={MAX_PLAYER_ROOMS}
      ownedRoom={
        ownedRoom
          ? {
              id: ownedRoom.id,
              name: ownedRoom.name,
              inviteToken: ownedRoom.inviteToken,
              pendingCount,
            }
          : null
      }
      active={memberships.filter((m) => m.status === "ACTIVE").map(mapMembership)}
      pending={memberships.filter((m) => m.status === "PENDING").map(mapMembership)}
      left={memberships.filter((m) => m.status === "LEFT").map(mapMembership)}
    />
  )
}
