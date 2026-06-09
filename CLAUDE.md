# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Next.js 16 has breaking changes.** Always read `node_modules/next/dist/docs/` before using any Next.js API. Do not rely on training data for Next.js, Prisma 7, NextAuth v5, Tailwind v4, or Zod v4.

## Commands

| Action                 | Command                                     |
| ---------------------- | ------------------------------------------- |
| Dev server             | `pnpm dev`                                  |
| Build                  | `pnpm build`                                |
| Lint                   | `pnpm lint` (ESLint 9 flat config)          |
| DB migrate             | `pnpm db:migrate`                           |
| DB seed                | `pnpm db:seed`                              |
| DB studio              | `pnpm db:studio`                            |
| Generate Prisma client | `pnpm postinstall` (runs `prisma generate`) |

There are no automated tests. Use `pnpm build` to catch type errors.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript 5** — path alias `@/` maps to project root
- **Prisma 7** + `@prisma/adapter-pg` (PostgreSQL) — schema: `prisma/schema.prisma`, config: `prisma.config.ts`
- **NextAuth v5** (beta 30) — credentials provider, JWT strategy
- **Daily.co** — WebRTC video, max 6 participants
- **Cloudinary** — portrait + background image hosting
- **Tailwind CSS v4** — PostCSS plugin, CSS-first config in `app/globals.css` (no `tailwind.config.js`)
- **Zod 4** — imported as `zod`, not `zod/v4`

## Project Structure

```
app/
  (auth)/login/           # Login page (unprotected)
  (protected)/            # Route group requiring auth session
    admin/                # DM-only dashboard (AdminClient.tsx)
    room/                 # Video room (RoomClient.tsx)
    customize/            # Player self-service profile editor (CustomizeClient.tsx)
  api/
    auth/[...nextauth]/   # NextAuth route handler
    daily/{room,token}/   # Daily.co room & token endpoints
    room/{live,state,status}/ # Room state management
    portraits/            # Portrait listing
    themes/               # Background (theme) CRUD
    soundtracks/          # Soundtrack CRUD
    tracks/               # Individual audio track CRUD
    soundtrack-tracks/    # Join table management (tracks <-> soundtracks)
    upload/               # Cloudinary upload (POST)
    upload/sign/          # Cloudinary signed upload params
    users/                # User CRUD + profile + shadow-color + [id]/portrait
    chat/                 # Chat message persistence

components/
  VideoRoom.tsx           # Main orchestrator (Daily.co call, state, broadcasts)
  VideoTile.tsx           # Per-participant video/portrait tile
  DmPanel.tsx             # Tabbed DM control panel (scene/music/atmosphere/players/profile)
  DmControls.tsx          # Inline DM controls (compact variant used in VideoRoom)
  PlayerControls.tsx      # Player-side controls
  SoundtrackManager.tsx   # DM tool for managing soundtracks + track library
  ThemeManager.tsx        # DM tool for managing backgrounds
  PlayerManager.tsx       # DM tool for managing player accounts
  Chat.tsx                # In-room chat overlay
  ParticleOverlay.tsx     # Ambient particle effects (snow/rain/embers/fog/night)
  ScreenShareAnnotation.tsx # Draw-on-screen annotation layer
  PortraitPicker.tsx      # Portrait selection UI
  UserForm.tsx            # User create/edit form
```

## Database Models

- **User** — `Role` (DM/PLAYER), `PlayerClass` enum, `seatIndex` (unique), `portraitUrl`, `shadowColor`
- **Background** — background images; `id` is a stable slug used as Cloudinary public ID
- **Soundtrack** — named playlist; has many `SoundtrackTrack` join records
- **Track** — individual audio file with `url`; reusable across soundtracks
- **SoundtrackTrack** — join table with `position` ordering; unique on `(soundtrackId, trackId)`
- **Folder** — hierarchical organizer for backgrounds and soundtracks (`FolderType` enum: BACKGROUND/SOUNDTRACK)
- **RoomState** — singleton (`id = "default"`); holds `backgroundId`, `soundtrackId`, `isLive`
- **ChatMessage** — persisted chat; stores `characterName` + `shadowColor` as snapshot fields

## Architecture

### Authentication (Two-file pattern)

- `auth.config.ts` — Edge-safe config (no Node.js imports). Used by middleware for route protection: `/room` and `/admin` require auth; `/login` redirects authenticated users to `/room`.
- `lib/auth.ts` — Full config: Credentials provider, bcrypt, Prisma lookup. Exports `{ handlers, auth, signIn, signOut }`. Extends JWT/session with `role`, `characterName`, `portraitUrl`, `seatIndex`, `shadowColor`.

### API Routes

All protected routes start with `const session = await auth()` and return 401 if absent. Use `NextResponse.json()`. No client-side imports.

### Video Room (Daily.co)

`VideoRoom.tsx` manages the Daily.co call lifecycle and syncs state to all participants via **app messages**:

| Message type             | Payload                                                |
| ------------------------ | ------------------------------------------------------ |
| `IDENTITY`               | User profile fields broadcast on join                  |
| `BACKGROUND_CHANGE`      | `backgroundId` + full `Background` object              |
| `SOUNDTRACK_CHANGE`      | `soundtrackId` + full `Soundtrack` + `startTrackIndex` |
| `VOLUME_CHANGE`          | `volume` (0–1)                                         |
| `PARTICLE_EFFECT_CHANGE` | `effect`: snow/rain/embers/fog/night/none              |
| `DRAW_STROKE`            | Annotation stroke data                                 |
| `DRAW_CLEAR`             | Clears annotation canvas                               |

`DEV_MODE=true` in `.env` enables mock participants (no real camera required).

### Images & Uploads

- `next.config.ts` allows remote images from `res.cloudinary.com` — always use `next/image` for Cloudinary URLs.
- Direct uploads go to `POST /api/upload`; large files (audio) use signed uploads via `GET /api/upload/sign`.

### Cloudinary + Prisma Helpers

- `lib/cloudinary.ts` — server-side Cloudinary SDK config
- `lib/daily.ts` — `getDailyRoom()` (get-or-create), `createDailyToken()`
- `lib/prisma.ts` — singleton with global cache to avoid connection exhaustion in dev

## Pitfalls

- **Prisma 7 adapter**: Uses `PrismaPg` adapter pattern in `prisma.config.ts` (`defineConfig` from `prisma/config`). Not a direct connection.
- **NextAuth v5 beta**: API differs from stable v4. Always check types.
- **Auth edge split**: Never import Prisma or bcrypt in `auth.config.ts` — it runs at the edge.
- **Tailwind v4**: All config is CSS-only in `app/globals.css`. Never create `tailwind.config.js`.
- **Zod v4**: Import from `zod` directly (not `zod/v4`). Some v3 APIs differ.
- **RoomState singleton**: Always query/update with `id = "default"`.
- **Background vs Theme**: The data model uses `Background` (not `Theme`). The old `Theme` model no longer exists.

## Allowed Actions

- Read/write source files under `app/`, `components/`, `lib/`, `prisma/`, `public/`
- Run `pnpm dev`, `pnpm build`, `pnpm lint`
- Run `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`
- Run `pnpm install` and `pnpm postinstall`
- Create/edit files in `.github/`
- Read config files: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `prisma.config.ts`, `package.json`

## Denied Actions

- **Never** read, write, print, or display `.env` / `.env.*` files
- **Never** run `git push`, `git reset --hard`, or amend published commits without explicit user approval
- **Never** run `rm -rf`, `DROP TABLE`, or `prisma migrate reset` without explicit user approval
- **Never** use `npm`, `yarn`, or `npx` — use `pnpm` or `pnpx` only
- **Never** bypass safety checks (`--no-verify`, `--force`)
- **Never** expose secrets in code or output

## Restricted Files

- `.env` / `.env.*` — secrets; do not access
- `pnpm-lock.yaml` — do not edit manually
- `node_modules/` — do not modify (read `node_modules/next/dist/docs/` for Next.js API reference only)
- `prisma/migrations/` — do not edit existing migrations; run `pnpm db:migrate` to create new ones
