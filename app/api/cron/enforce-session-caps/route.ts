import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { MAX_SESSION_HOURS } from "@/lib/rooms";
import { NextResponse } from "next/server";

// Backstop for the MAX_SESSION_HOURS hard cap: catches sessions left
// running (e.g. a DM who closed their laptop without leaving the call)
// that the live-route toggle never got a chance to close. Invoked by
// Vercel Cron for now; portable to any scheduler that can send an
// `Authorization: Bearer <CRON_SECRET>` header to this URL.
function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const maxSessionMs = MAX_SESSION_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - maxSessionMs);

  const overrun = await prisma.roomSession.findMany({
    where: { endedAt: null, startedAt: { lte: cutoff } },
    select: { id: true, roomId: true, startedAt: true },
  });

  for (const s of overrun) {
    // Cap the recorded duration at exactly MAX_SESSION_HOURS rather than
    // "now", so cron interval lag doesn't inflate the owner's weekly usage.
    const cappedEnd = new Date(s.startedAt.getTime() + maxSessionMs);
    await prisma.$transaction([
      prisma.roomSession.update({ where: { id: s.id }, data: { endedAt: cappedEnd } }),
      prisma.room.update({ where: { id: s.roomId }, data: { isLive: false } }),
    ]);
  }

  return NextResponse.json({ closed: overrun.length });
}
