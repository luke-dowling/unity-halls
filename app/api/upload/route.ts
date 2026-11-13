import { auth } from "@/actions/auth";
import { rateLimit, tooManyRequests } from "@/actions/rate-limit";
import { canUploadImages, isDm } from "@/actions/upload-access";
import { cloudinary } from "@/actions/cloudinary";
import { NextResponse } from "next/server";

// Uploads are read into memory and sent to Cloudinary, which costs storage and bandwidth: limit who, how much
// and how often (see actions/upload-access.ts).
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const UPLOADS_PER_USER_PER_HOUR = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const userId = session.user.id;

  const limited = rateLimit(`upload:user:${userId}`, UPLOADS_PER_USER_PER_HOUR, 60 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds, "Too many uploads. Please try again later.");

  // Reject oversized bodies before reading them into memory.
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_MEDIA_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 },
    );
  }

  const isImage = file.type.startsWith("image/");
  if (isImage ? !(await canUploadImages(userId)) : !(await isDm(userId))) {
    return NextResponse.json(
      { error: isImage ? "Join a room before uploading images" : "Only DMs can upload audio or video" },
      { status: 403 },
    );
  }

  const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_MEDIA_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${maxBytes / 1024 / 1024}MB)` },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const resourceType = file.type.startsWith("audio/") || file.type.startsWith("video/")
    ? "video"
    : "image";

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: resourceType,
            folder: folder || "unity-halls",
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed"));
            else resolve(result);
          },
        )
        .end(buffer);
    },
  );

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
  });
}
