@AGENTS.md

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
