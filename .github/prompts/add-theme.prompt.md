---
description: "Add a new theme with background image, music, and icon mapping"
argument-hint: "Theme name (e.g. 'volcano')"
agent: "agent"
---

Add a new theme to Unity Halls. Use the provided theme name (or ask for one).

## Steps

1. **Gather details** — Ask for:
   - Theme ID (lowercase, kebab-case, e.g. `volcano`)
   - Display name (e.g. `Volcano`)
   - Cloudinary background image URL (or leave empty for now)
   - Cloudinary music URL(s) (or leave empty for now)
   - Emoji icon for the theme selector

2. **Update seed data** — Add the new theme to the `THEMES` array in [prisma/seed.ts](../../prisma/seed.ts):

   ```ts
   {
     id: "<theme-id>",
     name: "<Display Name>",
     backgroundUrl: "<cloudinary-url-or-empty>",
     musicUrls: [<urls>] as string[],
   },
   ```

3. **Update icon mapping** — Add the emoji to `THEME_ICONS` in [components/DmControls.tsx](../../components/DmControls.tsx):

   ```ts
   "<theme-id>": "<emoji>",
   ```

4. **Seed the database** — Run `pnpm db:seed` to upsert the new theme.

5. **Verify** — Run `pnpm build` to confirm no errors.

Reference [AGENTS.md](../../AGENTS.md) for project conventions.
