import { prisma } from "@/lib/prisma";

export const MAX_PLAYER_ROOMS = 3;
export const MAX_SEATS = 5;

export async function getRoomAccess(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return { room: null, isOwner: false, membership: null } as const;

  const isOwner = room.ownerId === userId;
  const membership = await prisma.roomMembership.findUnique({
    where: { userId_roomId: { userId, roomId } },
  });

  return { room, isOwner, membership };
}

export function nextAvailableSeat(takenSeats: (number | null | undefined)[]): number | null {
  const taken = new Set(takenSeats.filter((s): s is number => s != null));
  for (let seat = 1; seat <= MAX_SEATS; seat++) {
    if (!taken.has(seat)) return seat;
  }
  return null;
}

export function countActivePlayerRooms(userId: string) {
  return prisma.roomMembership.count({ where: { userId, status: "ACTIVE" } });
}
