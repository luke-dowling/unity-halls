import { prisma } from "@/actions/prisma";

export const MAX_PLAYER_ROOMS = 3;
export const MAX_SEATS = 5;

// Weekly quota for FREE-tier room owners; PAID tier is unlimited.
export const FREE_TIER_WEEKLY_LIMIT_HOURS = 1;
// Hard cap on any single session, regardless of tier — protects against a
// session left running accidentally racking up unbounded time.
export const MAX_SESSION_HOURS = 1;

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

// Sums RoomSession time overlapping the trailing 7-day window (rolling, not
// a calendar-week reset, so quota can't be gamed around a reset boundary).
export async function getRoomWeeklyUsageSeconds(roomId: string, now = new Date()) {
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.roomSession.findMany({
    where: {
      roomId,
      OR: [{ endedAt: null }, { endedAt: { gt: windowStart } }],
    },
  });

  return sessions.reduce((total, s) => {
    const start = s.startedAt > windowStart ? s.startedAt : windowStart;
    const end = s.endedAt ?? now;
    return total + Math.max(0, (end.getTime() - start.getTime()) / 1000);
  }, 0);
}
