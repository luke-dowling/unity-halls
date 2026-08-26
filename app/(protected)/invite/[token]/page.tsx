import { auth } from "@/actions/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/actions/prisma"
import {
  MAX_PLAYER_ROOMS,
  nextAvailableSeat,
  countActivePlayerRooms,
} from "@/actions/rooms"
import Link from "next/link"

function InviteMessage({ title, body }: { title: string; body: string }) {
  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center gap-6 px-6 text-center'>
      <h1 className='font-serif text-2xl text-amber-400'>{title}</h1>
      <p className='text-stone-400 text-sm max-w-sm'>{body}</p>
      <Link
        href='/dashboard'
        className='px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors'
      >
        Back to Dashboard
      </Link>
    </main>
  )
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { token } = await params

  const room = await prisma.room.findUnique({ where: { inviteToken: token } })
  if (!room) {
    return (
      <InviteMessage
        title='Invite not found'
        body='This invite link is invalid or has been revoked.'
      />
    )
  }

  if (room.ownerId === session.user.id) {
    redirect(`/room/${room.id}`)
  }

  const existing = await prisma.roomMembership.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
  })

  if (existing?.status === "ACTIVE") {
    redirect(`/room/${room.id}`)
  }

  if (existing?.status === "PENDING") {
    return (
      <InviteMessage
        title='Request pending'
        body={`Your request to rejoin "${room.name}" is waiting for the DM to approve it.`}
      />
    )
  }

  // A LEFT membership means this player has been here before — rejoining
  // still needs the DM's approval, same as the dashboard's rejoin flow.
  // Only a first-time join is granted immediately by the link itself.
  if (existing?.status === "LEFT") {
    await prisma.roomMembership.update({
      where: { id: existing.id },
      data: { status: "PENDING", requestedAt: new Date() },
    })
    return (
      <InviteMessage
        title='Request sent'
        body={`You previously left "${room.name}". A request to rejoin has been sent to the DM.`}
      />
    )
  }

  const activeCount = await countActivePlayerRooms(session.user.id)
  if (activeCount >= MAX_PLAYER_ROOMS) {
    return (
      <InviteMessage
        title='Too many games'
        body={`You're already in ${MAX_PLAYER_ROOMS} games at once. Leave one from your dashboard before joining another.`}
      />
    )
  }

  const activeSeats = await prisma.roomMembership.findMany({
    where: { roomId: room.id, status: "ACTIVE" },
    select: { seatIndex: true },
  })
  const seat = nextAvailableSeat(activeSeats.map((m) => m.seatIndex))
  if (seat === null) {
    return (
      <InviteMessage
        title='Room is full'
        body={`"${room.name}" has no open seats right now.`}
      />
    )
  }

  await prisma.roomMembership.create({
    data: {
      userId: session.user.id,
      roomId: room.id,
      status: "ACTIVE",
      seatIndex: seat,
    },
  })

  redirect(`/room/${room.id}`)
}
