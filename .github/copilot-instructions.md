# Copilot Instructions

See [AGENTS.md](../AGENTS.md) for full project context, architecture, and conventions.

## Key Rules

1. **Next.js 16**: Read `node_modules/next/dist/docs/` before using any Next.js API — do not rely on training data.
2. **Tailwind v4**: CSS-first config in `app/globals.css`. No `tailwind.config.js`.
3. **Prisma 7**: Uses `PrismaPg` adapter, not direct connection. Schema at `prisma/schema.prisma`.
4. **Auth edge split**: `auth.config.ts` is Edge-only (no Prisma/bcrypt). Full auth in `lib/auth.ts`.
5. **NextAuth v5 beta 30**: Credentials provider, JWT strategy. Exports from `lib/auth.ts`.
6. **Zod 4**: Import from `zod` (not `zod/v4`).
7. **All interactive components** use `"use client"` directive.
8. **API routes**: Check `await auth()`, return `NextResponse.json()`. No client imports.
9. **pnpm** only — not npm or yarn.
10. **Path alias**: `@/` maps to project root.

## Allowed Actions

- Read/write source files under `app/`, `components/`, `lib/`, `prisma/`, `public/`
- Run `pnpm dev`, `pnpm build`, `pnpm lint`
- Run `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`
- Run `pnpm install` and `pnpm postinstall`
- Create/edit files in `.github/`
- Read config files: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `prisma.config.ts`, `package.json`

## Allowed Terminal Commands

- **Navigation**: `ls`, `ls -la`, `pwd`, `cd`, `find`
- **File viewing**: `cat`, `head`, `tail`, `less`
- **Search & count**: `grep`, `wc`
- **File operations**: `mkdir`, `cp`, `mv`
- **Output**: `echo` (never echo secrets)
- **Git (read)**: `git status`, `git diff`, `git log`, `git show`, `git branch`
- **Git (write)**: `git add`, `git commit`, `git switch`
- **Runtime**: `node`, `tsx`
- **Environment checks**: `which`, `whoami`

## Denied Actions

- **Never** read, write, print, log, or display `.env`, `.env.*`, or any file containing secrets
- **Never** run `git push`, `git push --force`, `git reset --hard`, or amend published commits without explicit user approval
- **Never** run destructive commands (`rm -rf`, `DROP TABLE`, `prisma migrate reset`) without explicit user approval
- **Never** install global packages or modify system-level config
- **Never** bypass safety checks (e.g. `--no-verify`, `--force`)
- **Never** expose API keys, tokens, passwords, or connection strings in code or output

## Denied Terminal Commands

- **Deletion**: `rm`, `rm -rf`, `rmdir`
- **Git (destructive)**: `git push`, `git push --force`, `git reset --hard`, `git rebase`, `git checkout`, `git stash`
- **Permissions**: `chmod`, `chown`
- **Privilege escalation**: `sudo`, `su`
- **Network**: `curl`, `wget` to unknown URLs
- **Process control**: `kill`, `killall`, `pkill`
- **Wrong package manager**: `npm`, `yarn`, `npx`

## Restricted Files (Do Not Access)

- `.env` / `.env.*` — contains database URLs, API keys, auth secrets
- `pnpm-lock.yaml` — do not edit manually
- `node_modules/` — do not modify (read `node_modules/next/dist/docs/` for Next.js API docs only)
- `prisma/migrations/` — do not edit existing migrations; use `pnpm db:migrate` to create new ones
