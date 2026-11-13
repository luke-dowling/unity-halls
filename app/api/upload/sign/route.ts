import { auth } from "@/actions/auth";
import { cloudinary } from "@/actions/cloudinary";
import { NextResponse } from "next/server";
import { rateLimit, tooManyRequests } from "@/actions/rate-limit";
import { isDm } from "@/actions/upload-access";

// Signed uploads go straight from the browser to Cloudinary (used for soundtrack audio), so this signature is
// the only gate: DMs only, and not too often.
const SIGNATURES_PER_USER_PER_HOUR = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await isDm(session.user.id))) {
    return NextResponse.json({ error: "Only DMs can upload audio" }, { status: 403 });
  }
  const limited = rateLimit(`upload-sign:user:${session.user.id}`, SIGNATURES_PER_USER_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "Too many uploads. Please try again later.");

  const { folder } = await req.json() as { folder?: string };
  const resolvedFolder = folder || "unity-halls";
  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign = { folder: resolvedFolder, timestamp };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({
    signature,
    timestamp,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    folder: resolvedFolder,
  });
}
