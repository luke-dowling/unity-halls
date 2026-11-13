# Unity Halls

A video session manager for your home D&D games — with character portraits, customizable themes, and DM controls.

Unity Halls lets a Dungeon Master host a video room where players join with their character portraits overlaid on their video feeds. The DM can swap background themes, manage players, and control the session — all from one dashboard.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router) with React 19
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io/) ORM
- **Auth**: [NextAuth v5](https://authjs.dev/) (Credentials + Google OAuth / JWT)
- **Video**: [LiveKit](https://livekit.io/), self-hosted (up to 6 participants)
- **Image Hosting**: [Cloudinary](https://cloudinary.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4

## Prerequisites

- **Node.js** 20+
- **pnpm** (package manager)
- **PostgreSQL** database
- **LiveKit** server — for video rooms. Self-host it with [`deploy/livekit`](deploy/livekit/README.md), or run `livekit-server --dev` locally
- **Cloudinary** account — for portrait uploads ([sign up](https://cloudinary.com/))

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/unity_halls
AUTH_SECRET=<random-secret-for-nextauth>

AUTH_GOOGLE_ID=<your-google-oauth-client-id>
AUTH_GOOGLE_SECRET=<your-google-oauth-client-secret>

LIVEKIT_URL=wss://livekit.example.com
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

ADMIN_EMAIL=<dm-email-for-seed>
SEED_DM_PASSWORD=<dm-password-for-seed>

DEV_MODE=true
```

| Variable             | Description                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                                                            |
| `AUTH_SECRET`        | Random secret for NextAuth (`npx auth secret` to generate)                                              |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)) |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret                                                                              |
| `LIVEKIT_URL`        | WebSocket URL of your LiveKit server (`wss://…`; `ws://localhost:7880` for local dev)                   |
| `LIVEKIT_API_KEY`    | LiveKit API key (must match the server's keys)                                                          |
| `LIVEKIT_API_SECRET` | LiveKit API secret                                                                                      |
| `CLOUDINARY_*`       | Cloudinary credentials for portrait uploads                                                             |
| `ADMIN_EMAIL`        | Email for the DM account created by the seed script                                                     |
| `SEED_DM_PASSWORD`   | Password for the seeded DM account                                                                      |
| `DEV_MODE`           | Set to `true` to use mock participants instead of live cameras                                          |

## Getting Started

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed the database (creates default DM + player accounts)
pnpm db:seed

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Available Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `pnpm dev`        | Start the development server   |
| `pnpm build`      | Build for production           |
| `pnpm start`      | Run the production build       |
| `pnpm db:migrate` | Run Prisma migrations          |
| `pnpm db:seed`    | Seed the database              |
| `pnpm db:studio`  | Open Prisma Studio (DB viewer) |
| `pnpm lint`       | Run ESLint                     |
