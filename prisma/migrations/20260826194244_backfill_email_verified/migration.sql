-- Grandfather in every account that existed before email verification was
-- introduced, so the new login gate (`if (!user.emailVerified)`) doesn't
-- lock out the existing user base.
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
