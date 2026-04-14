<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Unity Halls — Agent Instructions

A themed TTRPG video room app (D&D sessions). DM hosts video, players join with character portraits overlaid on feeds. DM controls themes, music, and player management.

## Quick Reference

| Action                 | Command                                     |
| ---------------------- | ------------------------------------------- |
| Install                | `pnpm install`                              |
| Dev server             | `pnpm dev`                                  |
| Build                  | `pnpm build`                                |
| Lint                   | `pnpm lint` (ESLint 9 flat config)          |
| DB migrate             | `pnpm db:migrate`                           |
| DB seed                | `pnpm db:seed`                              |
| DB studio              | `pnpm db:studio`                            |
| Generate Prisma client | `pnpm postinstall` (runs `prisma generate`) |

## Tech Stack

- **Next.js 16** (App Router) + **React 19** — read `node_modules/next/dist/docs/` for current APIs
- **TypeScript 5** with path alias `@/` → project root
- **Prisma 7** with `@prisma/adapter-pg` (PostgreSQL) — schema at `prisma/schema.prisma`, config at `prisma.config.ts`
- **NextAuth v5** (beta 30) — credentials provider, JWT strategy
- **Daily.co** — WebRTC video (max 6 participants)
- **Cloudinary** — portrait image hosting
- **Tailwind CSS v4** (PostCSS plugin) — no `tailwind.config`, uses CSS-first config in `app/globals.css`
- **pnpm** workspace (monorepo-ready but single package currently)
- **Zod 4** for validation

## Project Structure

```
app/
  layout.tsx              # Root layout (Geist fonts, global CSS)
  page.tsx                # Landing / home
  (auth)/login/           # Login page (unprotected)
  (protected)/            # Layout requires auth session → redirects to /login
    admin/                # DM dashboard (AdminClient.tsx)
    room/                 # Video room (RoomClient.tsx)
  api/
    auth/[...nextauth]/   # NextAuth route handler
    daily/{room,token}/   # Daily.co room & token endpoints
    room/{live,state,status}/ # Room state management
    portraits/            # Portrait listing
    themes/               # Theme CRUD
    upload/               # Cloudinary upload
    users/                # User CRUD + profile + shadow-color + [id]/portrait
```

## Architecture & Conventions

### Authentication (Two-file pattern)

- `auth.config.ts` — Edge-compatible config (no Node.js imports). Used by middleware for JWT checks. Defines route protection: `/room` and `/admin` are protected; `/login` redirects authenticated users to `/room`.
- `lib/auth.ts` — Full config with Credentials provider, bcrypt, Prisma lookup. Exports `{ handlers, auth, signIn, signOut }`. Extends JWT token and session with user fields (role, characterName, portraitUrl, seatIndex, shadowColor, etc.).

### Database (Prisma)

- **Models**: `User` (with `Role` enum: DM/PLAYER, `PlayerClass` enum), `Theme`, `RoomState`
- Prisma uses the `PrismaPg` adapter with `DATABASE_URL` env var
- Singleton pattern in `lib/prisma.ts` (global cache in dev to avoid connection exhaustion)
- Seed script (`prisma/seed.ts`) creates DM account + 7 themes (world-map, dungeon, forest, castle, battle, tavern, camp)

### API Routes

- All protected routes check `await auth()` and return 401 if no session
- Use `NextResponse.json()` for responses
- Server-side only — no client imports in route files

### Components

- `"use client"` directive on all interactive components
- `VideoRoom.tsx` — Main orchestrator: manages Daily.co call, participant state, theme broadcasts via app messages, audio playback
- `VideoTile.tsx` — Individual participant video/portrait tile with shadow color styling
- `DmControls.tsx` — Theme selector, music controls, profile editing, player/theme management triggers
- `PlayerControls.tsx` — Player-side controls (portrait, shadow color, profile)
- `PlayerManager.tsx` — DM tool for managing player accounts
- `ThemeManager.tsx` — DM tool for managing themes
- `PortraitPicker.tsx` — Portrait selection UI
- `UserForm.tsx` — User create/edit form

### Styling

- Tailwind v4 via PostCSS — classes applied directly in JSX
- Custom CSS variables for fonts (`--font-geist-sans`, `--font-geist-mono`)
- Shadow colors are per-user and stored in DB (`shadowColor` field)

### Video (Daily.co)

- `lib/daily.ts` — Server-side helpers: `getDailyRoom()` (get-or-create), `createDailyToken()`
- Room limited to 6 participants (5 players + 1 DM)
- `DEV_MODE=true` env var enables mock participants (no real camera needed)
- Identity exchanged via Daily app messages (`IDENTITY` / `THEME_CHANGE` types)

### Images

- `next.config.ts` allows remote images from `res.cloudinary.com`
- Use `next/image` `Image` component for Cloudinary URLs

## Environment Variables

See `README.md` for the full `.env` template. Key vars: `DATABASE_URL`, `AUTH_SECRET`, `DAILY_API_KEY`, `DAILY_ROOM_NAME`, `CLOUDINARY_*`, `ADMIN_EMAIL`, `SEED_DM_PASSWORD`, `DEV_MODE`.

## Pitfalls & Notes

- **Next.js 16 breaking changes**: Always check `node_modules/next/dist/docs/` before using any Next.js API. Do not rely on training data.
- **Prisma 7 + adapter pattern**: Uses `PrismaPg` adapter, not direct connection. The `prisma.config.ts` file uses `defineConfig` from `prisma/config`.
- **NextAuth v5 beta**: API surface may differ from stable v4. Check `next-auth` types carefully.
- **Tailwind v4**: No `tailwind.config.js` — configuration is CSS-first in `globals.css`. Don't create a JS config.
- **Auth edge split**: Don't import Prisma or bcrypt in `auth.config.ts` — it runs at the edge. Heavy imports go in `lib/auth.ts` only.
- **Zod v4**: Imported as `zod` (not `zod/v4`). API may differ from Zod v3.
