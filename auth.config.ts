import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible NextAuth config — no Node.js-only imports (no Prisma, no bcrypt).
 * Used by middleware for JWT verification only.
 * The full config (with the credentials provider) lives in lib/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isProtected =
        pathname.startsWith("/room") || pathname.startsWith("/admin");
      const isAuthPage = pathname.startsWith("/login");

      if (isProtected && !isLoggedIn) {
        // NextAuth redirects to the signIn page automatically
        return false;
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/room", nextUrl));
      }

      return true;
    },
  },
  providers: [], // populated in lib/auth.ts
};
