import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { NextResponse } from "next/server";

function isDm(session: { user: { role: string } }) {
  return session.user.role === "DM";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isDm(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // 50MB limit
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 50MB)" },
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
