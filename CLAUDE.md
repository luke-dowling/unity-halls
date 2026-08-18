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
- **Cloudinary** — portrait + soundtrack audio hosting
- **Tailwind CSS v4** — PostCSS plugin, CSS-first config in `app/globals.css` (no `tailwind.config.js`)
- **Zod 4** — imported as `zod`, not `zod/v4`

## Project Structure

```
app/
  (auth)/login/           # Login page (unprotected)
  (auth)/signup/          # Signup page — creates a User and their owned Room in one transaction
  (protected)/            # Route group requiring auth session
    dashboard/            # Landing page: owned room + invite link, active/pending/past memberships
    invite/[token]/       # Invite-link landing page — request to join a room
    room/[roomId]/        # Video room (RoomClient.tsx), scoped to one Room
    room/[roomId]/customize/ # Player self-service profile editor (CustomizeClient.tsx)
  api/
    auth/[...nextauth]/   # NextAuth route handler
    auth/signup/          # Account creation (also creates the user's Room)
    daily/{room,token}/   # Daily.co room & token endpoints
    rooms/                # List rooms the current user owns/belongs to (GET only — no room creation endpoint)
    rooms/[roomId]/       # Room details; {live,state,status} state management, invite (token regen),
                           # members (approve/deny/kick), membership (join/leave/rejoin), chat
    portraits/            # Portrait listing
    soundtracks/          # Soundtrack CRUD
    tracks/               # Individual audio track CRUD
    soundtrack-tracks/    # Join table management (tracks <-> soundtracks)
    upload/               # Cloudinary upload (POST)
    upload/sign/          # Cloudinary signed upload params

components/
  VideoRoom.tsx           # Main orchestrator (Daily.co call, state, broadcasts) — one instance per Room
  VideoTile.tsx           # Per-participant video/portrait tile
  DmPanel.tsx             # Tabbed DM control panel (background/music/atmosphere/players/profile)
  PlayerControls.tsx      # Player-side controls
  SoundtrackManager.tsx   # DM tool for managing soundtracks + track library
  RoomMembersPanel.tsx    # DM tool for approving/denying/kicking room members
  Chat.tsx                # In-room chat overlay
  ParticleOverlay.tsx     # Ambient particle effects (snow/rain/embers/fog/night)
  ScreenShareAnnotation.tsx # Draw-on-screen annotation layer
```

## Database Models

- **User** — account only (`email`, `name`, `passwordHash`); no longer carries room-specific fields
- **Room** — one per DM, created automatically at signup (`app/api/auth/signup/route.ts`); holds `ownerId`, `ownerCharacterName`/`ownerPortraitUrl`/`ownerShadowColor` (the owner's DM persona), `backgroundColor`, `soundtrackId`, `isLive`, unique `inviteToken`. There is no endpoint to create additional rooms, so in practice each user owns at most one.
- **RoomMembership** — join table between `User` and `Room` for players; `MembershipStatus` enum (ACTIVE/LEFT/PENDING), `seatIndex` (unique per room), `characterName`, `playerClass`, `portraitUrl`, `shadowColor`. A player can hold ACTIVE membership in up to `MAX_PLAYER_ROOMS` (3, see `lib/rooms.ts`) rooms at once.
- **Soundtrack** — named playlist; has many `SoundtrackTrack` join records; referenced by any number of `Room`s
- **Track** — individual audio file with `url`; reusable across soundtracks
- **SoundtrackTrack** — join table with `position` ordering; unique on `(soundtrackId, trackId)`
- **Folder** — hierarchical organizer for soundtracks (`FolderType` enum: SOUNDTRACK)
- **ChatMessage** — persisted chat, scoped to a `roomId`; stores `characterName` + `shadowColor` as snapshot fields

## Architecture

### Multi-Room Model

Each DM's session is its own `Room` row, created automatically in the signup transaction (`app/api/auth/signup/route.ts`) — there is no UI or endpoint to create a second room, so one user account = one owned room. Rooms are fully independent: each has its own `backgroundColor`, `soundtrackId`, `isLive` flag, and its own Daily.co room (`unity-halls-${roomId}`, see `lib/daily.ts`). Any number of different DMs' rooms can be live at the same time with zero shared state. Players join via `/invite/[token]` and can hold ACTIVE membership in up to `MAX_PLAYER_ROOMS` (3) rooms simultaneously, but a DM cannot host more than one room without a second account.

`lib/rooms.ts` — `getRoomAccess(roomId, userId)` (returns `{ room, isOwner, membership }`, the standard authorization check for room-scoped routes), `nextAvailableSeat()`, `countActivePlayerRooms()`.

### Authentication (Two-file pattern)

- `auth.config.ts` — Edge-safe config (no Node.js imports). Used by middleware for route protection: `/dashboard`, `/room`, and `/invite` require auth; `/login` and `/signup` redirect authenticated users to `/dashboard`.
- `lib/auth.ts` — Full config: Credentials provider, bcrypt, Prisma lookup. Exports `{ handlers, auth, signIn, signOut }`.

### API Routes

All protected routes start with `const session = await auth()` and return 401 if absent. Room-scoped routes (`app/api/rooms/[roomId]/...`) additionally call `getRoomAccess()` and return 404 if the room doesn't exist or 403 if the caller is neither the owner nor an active member. Use `NextResponse.json()`. No client-side imports.

### Video Room (Daily.co)

`VideoRoom.tsx` manages the Daily.co call lifecycle for a single `roomId` and syncs state to that room's participants via **app messages** (each room's Daily.co call is a separate namespace, so messages never cross rooms):

| Message type             | Payload                                                |
| ------------------------ | ------------------------------------------------------ |
| `IDENTITY`               | User profile fields broadcast on join                  |
| `BACKGROUND_COLOR_CHANGE`| `backgroundColor` (hex string)                         |
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
- **No `RoomState` singleton**: Room state (`backgroundColor`, `soundtrackId`, `isLive`) lives directly on each `Room` row, not a shared singleton. Always scope queries/updates by `roomId`.
- **One owned room per user, not enforced by the schema**: `Room.ownerId` has no unique constraint — the "one room per DM" rule is only upheld by there being no room-creation endpoint. Don't add one without deciding how multi-room DMs should work first.
- **Background is a color, not an image**: The room backdrop is a plain `backgroundColor` hex string on `Room`, set by the DM. There is no `Background` model, no background image upload, and no `/api/themes` route.

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
