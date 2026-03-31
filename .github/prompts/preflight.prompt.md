---
description: "Run lint and build checks before committing to catch errors early"
agent: "agent"
---

Run pre-commit checks for the project:

1. **Lint** — Run `pnpm lint` and report any ESLint errors or warnings.
2. **Build** — Run `pnpm build` and report any TypeScript or build errors.
3. **Summary** — If both pass, confirm the project is ready to commit. If either fails, list the errors with file locations and suggest fixes.
