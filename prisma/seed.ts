import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BACKGROUNDS = [
  {
    id: "world-map",
    name: "World Map",
    backgroundUrl: "https://res.cloudinary.com/dkjzfvfws/image/upload/v1774598171/Parador_Second_Sundering_tdiumi.webp",
  },
  { id: "dungeon", name: "Dungeon", backgroundUrl: "https://res.cloudinary.com/dkjzfvfws/image/upload/v1712649570/test190.jpg" },
  { id: "forest", name: "Forest", backgroundUrl: "" },
  { id: "castle", name: "Castle", backgroundUrl: "" },
  { id: "battle", name: "Battle", backgroundUrl: "" },
  { id: "tavern", name: "Tavern", backgroundUrl: "" },
  { id: "camp", name: "Camp", backgroundUrl: "" },
];

const SOUNDTRACKS = [
  { id: "world-map", name: "World Map" },
  { id: "dungeon", name: "Dungeon" },
  { id: "forest", name: "Forest" },
  { id: "castle", name: "Castle" },
  { id: "battle", name: "Battle" },
  { id: "tavern", name: "Tavern" },
  { id: "camp", name: "Camp" },
];

const TRACKS = [
  {
    id: "track-world-map-1",
    name: "Nightlands",
    url: "https://res.cloudinary.com/dkjzfvfws/video/upload/v1774598042/450_Nightlands_xykuke.mp3",
  },
  {
    id: "track-dungeon-1",
    name: "Darkmoor",
    url: "https://res.cloudinary.com/dkjzfvfws/video/upload/v1774598262/442_Darkmoor_ancez0.mp3",
  },
];

const SOUNDTRACK_TRACKS = [
  { soundtrackId: "world-map", trackId: "track-world-map-1", position: 0 },
  { soundtrackId: "dungeon", trackId: "track-dungeon-1", position: 0 },
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

  for (const bg of BACKGROUNDS) {
    await prisma.background.upsert({
      where: { id: bg.id },
      create: bg,
      update: { name: bg.name, backgroundUrl: bg.backgroundUrl },
    });
  }

  for (const st of SOUNDTRACKS) {
    await prisma.soundtrack.upsert({
      where: { id: st.id },
      create: st,
      update: { name: st.name },
    });
  }

  for (const track of TRACKS) {
    await prisma.track.upsert({
      where: { id: track.id },
      create: track,
      update: { name: track.name, url: track.url },
    });
  }

  for (const st of SOUNDTRACK_TRACKS) {
    await prisma.soundtrackTrack.upsert({
      where: { soundtrackId_trackId: { soundtrackId: st.soundtrackId, trackId: st.trackId } },
      create: st,
      update: { position: st.position },
    });
  }

  await prisma.roomState.upsert({
    where: { id: "default" },
    create: { id: "default", backgroundId: "world-map", isLive: false },
    update: {},
  });

  console.log(`DM account ready: ${dm.email}`);
  console.log(`Seeded ${BACKGROUNDS.length} backgrounds, ${SOUNDTRACKS.length} soundtracks, ${TRACKS.length} tracks`);
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
