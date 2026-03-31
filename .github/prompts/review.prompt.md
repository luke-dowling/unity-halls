---
description: "Review staged or unstaged changes for bugs, security issues, and convention violations"
agent: "agent"
---

Review the current git changes for this project. Follow these steps:

1. Run `git diff` to see unstaged changes, and `git diff --cached` for staged changes.
2. For each changed file, check for:
   - **Bugs**: Logic errors, null/undefined risks, missing error handling at system boundaries
   - **Security**: Exposed secrets, missing auth checks on API routes, XSS/injection risks
   - **Convention violations**: Missing `"use client"` on interactive components, wrong imports (`zod/v4` instead of `zod`), Prisma/bcrypt imported in `auth.config.ts`, `npm`/`yarn` usage instead of `pnpm`, Tailwind config in JS instead of CSS
   - **Auth pattern**: API routes must check `await auth()` and return 401 if no session
   - **Next.js 16 pitfalls**: Check `node_modules/next/dist/docs/` if unsure about any API usage
3. Report findings grouped by severity: **Critical** → **Warning** → **Suggestion**
4. If everything looks clean, confirm the changes are ready to commit.

Reference [AGENTS.md](../../AGENTS.md) for full project conventions.
