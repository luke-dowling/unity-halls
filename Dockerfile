# Production image for Unity Halls, published to ghcr.io/luke-dowling/unity-halls by .github/workflows/publish.yml
# and run by the unity-halls-infra repo. Settings come from the environment at runtime, not at build time.
#
#   docker run --env-file .env -p 3000:3000 ghcr.io/luke-dowling/unity-halls        → the app
#   docker run --env-file .env ghcr.io/luke-dowling/unity-halls migrate              → apply Prisma migrations, then exit

# Debian rather than Alpine: Prisma's schema engine needs glibc + OpenSSL.
FROM node:22-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS build
# prisma.config.ts refuses to load without DATABASE_URL, even for `prisma generate`. This placeholder is only
# used while building; nothing connects to it, and it isn't in the final image's environment.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}
# Dependencies first, so source-only changes reuse the cached install. postinstall runs `prisma generate`.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    AUTH_TRUST_HOST=true
# The whole app, node_modules included: `next start` needs it, and so does the Prisma CLI for `migrate`.
COPY --from=build --chown=node:node /app ./
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["start"]
