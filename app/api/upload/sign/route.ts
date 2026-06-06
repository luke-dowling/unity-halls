import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
