import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const THEMES = [
  {
    id: "world-map",
    name: "World Map",
    backgroundUrl: "https://res.cloudinary.com/dkjzfvfws/image/upload/v1774598171/Parador_Second_Sundering_tdiumi.webp",
    musicUrls: ["https://res.cloudinary.com/dkjzfvfws/video/upload/v1774598042/450_Nightlands_xykuke.mp3"] as string[],
  },
  {
    id: "dungeon",
    name: "Dungeon",
    backgroundUrl: "https://res.cloudinary.com/dkjzfvfws/image/upload/v1712649570/test190.jpg",
    musicUrls: ["https://res.cloudinary.com/dkjzfvfws/video/upload/v1774598262/442_Darkmoor_ancez0.mp3"] as string[],
  },
  {
    id: "forest",
    name: "Forest",
    backgroundUrl: "",
    musicUrls: [] as string[],
  },
  {
    id: "castle",
    name: "Castle",
    backgroundUrl: "",
    musicUrls: [] as string[],
  },
  {
    id: "battle",
    name: "Battle",
    backgroundUrl: "",
    musicUrls: [] as string[],
  },
  {
    id: "tavern",
    name: "Tavern",
    backgroundUrl: "",
    musicUrls: [] as string[],
  },
  {
    id: "camp",
    name: "Camp",
    backgroundUrl: "",
    musicUrls: [] as string[],
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
      update: { name: theme.name, backgroundUrl: theme.backgroundUrl, musicUrls: theme.musicUrls },
    });
  }

  await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", themeId: "world-map", isLive: false },
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
