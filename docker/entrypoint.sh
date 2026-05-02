#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  echo "Running database seed..."
  node prisma/seed.js
fi

# Create workspace symlinks pointing to compiled dist (not TypeScript source)
if [ "$SERVICE_TYPE" = "worker" ]; then
  DIST="apps/worker/dist"
else
  DIST="apps/api/dist"
fi

mkdir -p node_modules/@pred
ln -sf "../../$DIST/libs/domain" node_modules/@pred/domain
ln -sf "../../$DIST/libs/application" node_modules/@pred/application
ln -sf "../../$DIST/libs/infrastructure" node_modules/@pred/infrastructure
ln -sf "../../$DIST/libs/shared" node_modules/@pred/shared

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "Starting Worker..."
  exec node apps/worker/dist/apps/worker/src/main
else
  echo "Starting API..."
  exec node apps/api/dist/apps/api/src/main
fi
