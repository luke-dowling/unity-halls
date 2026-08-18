import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// Proxy uses the edge-safe config only — no Prisma, no bcrypt.
export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/room/:path*", "/invite/:path*", "/login", "/signup"],
};
