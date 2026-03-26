import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Middleware uses the edge-safe config only — no Prisma, no bcrypt.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/room/:path*", "/admin/:path*", "/login"],
};
