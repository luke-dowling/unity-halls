import "dotenv/config";
import { PlayerClass, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

const PLAYERS = [
  {
    email: "kestra@example.com",
    name: "Kestra's Player",
    characterName: "Kestra Nightwind",
    playerClass: PlayerClass.RANGER,
    shadowColor: "#38bdf8",
    seatIndex: 0,
  },
  {
    email: "aldwin@example.com",
    name: "Aldwin's Player",
    characterName: "Brother Aldwin",
    playerClass: PlayerClass.CLERIC,
    shadowColor: "#a78bfa",
    seatIndex: 1,
  },
  {
    email: "vex@example.com",
    name: "Vex's Player",
    characterName: "Vex Emberclaw",
    playerClass: PlayerClass.SORCERER,
    shadowColor: "#f87171",
    seatIndex: 2,
  },
];

async function wipeAllData() {
  await prisma.chatMessage.deleteMany();
  await prisma.roomMembership.deleteMany();
  await prisma.roomSession.deleteMany();
  await prisma.soundtrackTrack.deleteMany();
  await prisma.room.deleteMany();
  await prisma.soundtrack.deleteMany();
  await prisma.track.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "dm@example.com";
  const adminPassword = process.env.SEED_DM_PASSWORD ?? "change-me-now";
  const playerPassword = process.env.SEED_PLAYER_PASSWORD ?? "change-me-now";

  console.log("Wiping existing data...");
  await wipeAllData();

  const [dmPasswordHash, playerPasswordHash] = await Promise.all([
    hash(adminPassword, 12),
    hash(playerPassword, 12),
  ]);

  const dm = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Dungeon Master",
      passwordHash: dmPasswordHash,
      emailVerified: new Date(),
    },
  });

  const room = await prisma.room.create({
    data: {
      name: `${dm.name}'s Game`,
      ownerId: dm.id,
      ownerCharacterName: "The DM",
    },
  });

  for (const st of SOUNDTRACKS) {
    await prisma.soundtrack.create({ data: st });
  }
  for (const track of TRACKS) {
    await prisma.track.create({ data: track });
  }
  for (const st of SOUNDTRACK_TRACKS) {
    await prisma.soundtrackTrack.create({ data: st });
  }

  await prisma.room.update({
    where: { id: room.id },
    data: { soundtrackId: "world-map" },
  });

  const players = [];
  for (const p of PLAYERS) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        name: p.name,
        passwordHash: playerPasswordHash,
        emailVerified: new Date(),
      },
    });
    await prisma.roomMembership.create({
      data: {
        userId: user.id,
        roomId: room.id,
        status: "ACTIVE",
        seatIndex: p.seatIndex,
        characterName: p.characterName,
        playerClass: p.playerClass,
        shadowColor: p.shadowColor,
      },
    });
    players.push({ ...p, userId: user.id });
  }

  const [kestra, aldwin] = players;
  await prisma.chatMessage.create({
    data: {
      userId: dm.id,
      roomId: room.id,
      characterName: "The DM",
      shadowColor: "#f59e0b",
      content: "The tavern door creaks open. Rain hisses against the shutters as three strangers step inside.",
    },
  });
  await prisma.chatMessage.create({
    data: {
      userId: kestra.userId,
      roomId: room.id,
      characterName: kestra.characterName,
      shadowColor: kestra.shadowColor,
      content: "Kestra scans the room, one hand resting on her bow.",
    },
  });
  await prisma.chatMessage.create({
    data: {
      userId: aldwin.userId,
      roomId: room.id,
      characterName: aldwin.characterName,
      shadowColor: aldwin.shadowColor,
      content: "Brother Aldwin offers a quiet blessing to the room before finding a seat by the fire.",
    },
  });

  console.log(`DM account ready: ${dm.email}`);
  console.log(`Seeded ${players.length} players into room "${room.name}"`);
  console.log(`Seeded ${SOUNDTRACKS.length} soundtracks, ${TRACKS.length} tracks`);
  if (adminPassword === "change-me-now" || playerPassword === "change-me-now") {
    console.log("Set SEED_DM_PASSWORD / SEED_PLAYER_PASSWORD in .env.local to avoid the default password.");
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
