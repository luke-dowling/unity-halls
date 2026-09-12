-- Grandfather in every account that already owns a Room, so the new
-- isDM gate (only DMs can own/start a Room) doesn't lock out DMs who
-- were onboarded before this flag existed.
UPDATE "User" SET "isDM" = true WHERE "id" IN (SELECT "ownerId" FROM "Room");
