import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extract public_id and resource_type from a Cloudinary URL.
// URL format: https://res.cloudinary.com/{cloud}/{resource_type}/upload[/v{digits}]/{public_id}.{ext}
function parseCloudinaryUrl(url: string): { publicId: string; resourceType: "image" | "video" } | null {
  const match = url.match(
    /res\.cloudinary\.com\/[^/]+\/(image|video)\/upload(?:\/v\d+)?\/(.+)\.[^.]+$/
  );
  if (!match) return null;
  return {
    resourceType: match[1] as "image" | "video",
    publicId: match[2],
  };
}

// Best-effort delete — logs on failure but never throws, so callers aren't blocked.
export async function deleteCloudinaryAsset(url: string): Promise<void> {
  if (!url) return;
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return;
  try {
    await cloudinary.uploader.destroy(parsed.publicId, {
      resource_type: parsed.resourceType,
    });
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset ${parsed.publicId}:`, err);
  }
}

export { cloudinary };
