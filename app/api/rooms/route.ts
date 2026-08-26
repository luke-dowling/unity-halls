import { auth } from "@/actions/auth";
import { prisma } from "@/actions/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ownedRoom, memberships] = await Promise.all([
    prisma.room.findFirst({ where: { ownerId: session.user.id } }),
    prisma.roomMembership.findMany({
      where: { userId: session.user.id },
      include: { room: { include: { owner: { select: { name: true } } } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const pendingCount = ownedRoom
    ? await prisma.roomMembership.count({ where: { roomId: ownedRoom.id, status: "PENDING" } })
    : 0;

  return NextResponse.json({
    ownedRoom: ownedRoom ? { ...ownedRoom, pendingCount } : null,
    active: memberships.filter((m) => m.status === "ACTIVE"),
    pending: memberships.filter((m) => m.status === "PENDING"),
    left: memberships.filter((m) => m.status === "LEFT"),
  });
}
