import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/actions/prisma";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google,
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
        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        if (!user.emailVerified) throw new EmailNotVerified();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const existing = await prisma.user.findUnique({ where: { email: user.email } });

      const dbUser = await prisma.$transaction(async (tx) => {
        // Google has just proven ownership of this email. If it's merging into
        // an existing-but-unverified row, treat that as the verification event
        // and invalidate any password/verification token already sitting on
        // it — otherwise a password an attacker pre-registered under this
        // email (before the real owner ever signed up) would silently become
        // valid for credentials login once this merge completes.
        const upserted = await tx.user.upsert({
          where: { email: user.email! },
          update:
            existing && !existing.emailVerified
              ? {
                  emailVerified: new Date(),
                  passwordHash: null,
                  verificationToken: null,
                  verificationTokenExpiresAt: null,
                }
              : {},
          create: {
            email: user.email!,
            name: user.name ?? user.email!,
            emailVerified: new Date(),
          },
        });

        // Credentials signup creates the owner's Room in the same transaction
        // as the User — mirror that here so a first-time Google signup gets
        // one too (there's no separate room-creation endpoint to fall back on).
        // Upsert on the unique ownerId rather than gating on `existing`: two
        // concurrent sign-ins for the same brand-new email would otherwise
        // both see `existing === null` and both try to create a room.
        await tx.room.upsert({
          where: { ownerId: upserted.id },
          update: {},
          create: { name: `${upserted.name}'s Game`, ownerId: upserted.id },
        });

        return upserted;
      });

      user.id = dbUser.id;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}
