import { prisma } from "@/actions/prisma";

/**
 * Who may upload to Cloudinary. Uploads cost storage and bandwidth on the Cloudinary account, so a freshly
 * signed-up account (anyone can sign up) must not be able to upload until a DM has let it in somewhere.
 *
 *   images (portraits)   DMs, and players with an ACTIVE membership in at least one room
 *   audio / video        DMs only (soundtracks are a DM tool)
 *
 * A DM is an account flagged isDM or one that owns a room.
 */
export async function isDm(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isDM: true, _count: { select: { ownedRooms: true } } },
  });
  return !!user && (user.isDM || user._count.ownedRooms > 0);
}

export async function canUploadImages(userId: string): Promise<boolean> {
  if (await isDm(userId)) return true;
  const active = await prisma.roomMembership.count({ where: { userId, status: "ACTIVE" } });
  return active > 0;
}
