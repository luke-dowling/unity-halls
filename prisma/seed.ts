import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const THEMES = [
  {
    id: "forest",
    name: "Forest",
    backgroundUrl: "",
    musicUrl: "",
  },
  {
    id: "castle",
    name: "Castle",
    backgroundUrl: "",
    musicUrl: "",
  },
  {
    id: "battle",
    name: "Battle",
    backgroundUrl: "",
    musicUrl: "",
  },
  {
    id: "tavern",
    name: "Tavern",
    backgroundUrl: "",
    musicUrl: "",
  },
  {
    id: "dungeon",
    name: "Dungeon",
    backgroundUrl: "",
    musicUrl: "",
  },
  {
    id: "camp",
    name: "Camp",
    backgroundUrl: "",
    musicUrl: "",
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "dm@example.com";
  const adminPassword = process.env.SEED_DM_PASSWORD ?? "change-me-now";

  const passwordHash = await hash(adminPassword, 12);

  const dm = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Dungeon Master",
      passwordHash,
      characterName: "The DM",
      role: "DM",
    },
    update: { role: "DM" },
  });

  // Seed themes
  for (const theme of THEMES) {
    await prisma.theme.upsert({
      where: { id: theme.id },
      create: theme,
      update: { name: theme.name, backgroundUrl: theme.backgroundUrl, musicUrl: theme.musicUrl },
    });
  }

  await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", themeId: "tavern", isLive: false },
    update: {},
  });

  console.log(`DM account ready: ${dm.email}`);
  console.log(`Seeded ${THEMES.length} themes`);
  if (adminPassword === "change-me-now") {
    console.log("⚠  Set SEED_DM_PASSWORD in .env.local before seeding in production!");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
