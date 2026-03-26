import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import path from "path";

export async function GET() {
  const portraitsDir = path.join(process.cwd(), "public", "portraits");
  try {
    const files = await readdir(portraitsDir);
    const portraits = files
      .filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f))
      .map((f) => ({ id: f, url: `/portraits/${f}` }));
    return NextResponse.json(portraits);
  } catch {
    // Directory doesn't exist yet — return empty list
    return NextResponse.json([]);
  }
}
