import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          characterName: user.characterName ?? undefined,
          portraitId: user.portraitId ?? undefined,
          portraitUrl: user.portraitUrl ?? undefined,
          playerClass: user.playerClass ?? undefined,
          seatIndex: user.seatIndex ?? undefined,
          shadowColor: user.shadowColor ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role;
        token.characterName = (user as { characterName?: string }).characterName;
        token.portraitId = (user as { portraitId?: string }).portraitId;
        token.portraitUrl = (user as { portraitUrl?: string }).portraitUrl;
        token.playerClass = (user as { playerClass?: string }).playerClass;
        token.seatIndex = (user as { seatIndex?: number }).seatIndex;
        token.shadowColor = (user as { shadowColor?: string }).shadowColor;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.role = (token.role as string) ?? "PLAYER";
      session.user.characterName = token.characterName as string | undefined;
      session.user.portraitId = token.portraitId as string | undefined;
      session.user.portraitUrl = token.portraitUrl as string | undefined;
      session.user.playerClass = token.playerClass as string | undefined;
      session.user.seatIndex = token.seatIndex as number | undefined;
      session.user.shadowColor = token.shadowColor as string | undefined;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});

declare module "next-auth" {
  interface User {
    role?: string;
    characterName?: string;
    portraitId?: string;
    portraitUrl?: string;
    playerClass?: string;
    seatIndex?: number;
    shadowColor?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      characterName?: string;
      portraitId?: string;
      portraitUrl?: string;
      playerClass?: string;
      seatIndex?: number;
      shadowColor?: string;
    };
  }
}
