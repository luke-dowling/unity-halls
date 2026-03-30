# Unity Halls

A video session manager for your home D&D games — with character portraits, customizable themes, and DM controls.

Unity Halls lets a Dungeon Master host a video room where players join with their character portraits overlaid on their video feeds. The DM can swap background themes, manage players, and control the session — all from one dashboard.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router) with React 19
- **Database**: PostgreSQL via [Prisma](https://www.prisma.io/) ORM
- **Auth**: [NextAuth v5](https://authjs.dev/) (Credentials / JWT)
- **Video**: [Daily.co](https://www.daily.co/) (up to 6 participants)
- **Image Hosting**: [Cloudinary](https://cloudinary.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4

## Prerequisites

- **Node.js** 20+
- **pnpm** (package manager)
- **PostgreSQL** database
- **Daily.co** account — for video rooms ([get an API key](https://dashboard.daily.co/))
- **Cloudinary** account — for portrait uploads ([sign up](https://cloudinary.com/))

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/unity_halls
AUTH_SECRET=<random-secret-for-nextauth>

DAILY_API_KEY=<your-daily-api-key>
DAILY_ROOM_NAME=unity-halls

CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

ADMIN_EMAIL=<dm-email-for-seed>
SEED_DM_PASSWORD=<dm-password-for-seed>

DEV_MODE=true
```

| Variable             | Description                                                    |
| -------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                   |
| `AUTH_SECRET`        | Random secret for NextAuth (`npx auth secret` to generate)     |
| `DAILY_API_KEY`      | API key from your Daily.co dashboard                           |
| `DAILY_ROOM_NAME`    | Name of the Daily room (defaults to `unity-halls`)             |
| `CLOUDINARY_*`       | Cloudinary credentials for portrait uploads                    |
| `ADMIN_EMAIL`        | Email for the DM account created by the seed script            |
| `SEED_DM_PASSWORD`   | Password for the seeded DM account                             |
| `DEV_MODE`           | Set to `true` to use mock participants instead of live cameras |

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
