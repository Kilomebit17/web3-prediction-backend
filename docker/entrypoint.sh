#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "Starting Worker..."
  exec node apps/worker/dist/apps/worker/src/main
else
  echo "Starting API..."
  exec node apps/api/dist/apps/api/src/main
fi
