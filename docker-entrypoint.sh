#!/bin/sh
# Entrypoint for the production image (see Dockerfile).
#   start    (default) run the Next.js server
#   migrate  apply pending Prisma migrations (`prisma migrate deploy`) and exit
#   anything else is run as a command, e.g. `sh` for a shell
set -e
case "$1" in
  start)   exec node_modules/.bin/next start ;;
  migrate) exec node_modules/.bin/prisma migrate deploy ;;
  *)       exec "$@" ;;
esac
