import { timingSafeEqual } from "crypto";
import { prisma } from "@/actions/prisma";
import { FREE_TIER_WEEKLY_LIMIT_HOURS, MAX_SESSION_HOURS, getRoomWeeklyUsageSeconds } from "@/actions/rooms";
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

  const now = new Date();

  // Tier-aware hard cut: force-end a live FREE-tier session the moment its
  // room's rolling 7-day usage crosses the free quota, so the weekly limit
  // is enforced mid-session rather than only gating whether a new one can
  // start (a DM could otherwise chain several under-limit sessions and blow
  // past the cap across the week without ever tripping MAX_SESSION_HOURS).
  const limitSeconds = FREE_TIER_WEEKLY_LIMIT_HOURS * 3600;
  const liveSessions = await prisma.roomSession.findMany({
    where: { endedAt: null },
    select: { id: true, roomId: true, startedAt: true, room: { select: { ownerId: true } } },
  });

  let tierClosed = 0;
  for (const s of liveSessions) {
    const owner = await prisma.user.findUnique({
      where: { id: s.room.ownerId },
      select: { planTier: true },
    });
    if (owner?.planTier === "PAID") continue;

    const usedSeconds = await getRoomWeeklyUsageSeconds(s.roomId, now);
    if (usedSeconds <= limitSeconds) continue;

    // Cap the recorded duration at exactly the free quota rather than
    // "now", so cron interval lag doesn't let a session overshoot its cap.
    const overageMs = (usedSeconds - limitSeconds) * 1000;
    const cappedEnd = new Date(Math.max(s.startedAt.getTime(), now.getTime() - overageMs));
    await prisma.$transaction([
      prisma.roomSession.update({ where: { id: s.id }, data: { endedAt: cappedEnd } }),
      prisma.room.update({ where: { id: s.roomId }, data: { isLive: false } }),
    ]);
    tierClosed++;
  }

  // Blanket backstop for any single session (regardless of tier) that's
  // still open past MAX_SESSION_HOURS, e.g. a DM who closed their laptop
  // without leaving the call — catches what the toggle never got to close.
  const maxSessionMs = MAX_SESSION_HOURS * 60 * 60 * 1000;
  const cutoff = new Date(now.getTime() - maxSessionMs);

  const overrun = await prisma.roomSession.findMany({
    where: { endedAt: null, startedAt: { lte: cutoff } },
    select: { id: true, roomId: true, startedAt: true },
  });

  for (const s of overrun) {
    const cappedEnd = new Date(s.startedAt.getTime() + maxSessionMs);
    await prisma.$transaction([
      prisma.roomSession.update({ where: { id: s.id }, data: { endedAt: cappedEnd } }),
      prisma.room.update({ where: { id: s.roomId }, data: { isLive: false } }),
    ]);
  }

  return NextResponse.json({ closed: tierClosed + overrun.length });
}
