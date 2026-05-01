#!/bin/sh
set -e

echo "Running database migrations..."
prisma migrate deploy

if [ "$SERVICE_TYPE" = "worker" ]; then
  echo "Starting Worker..."
  exec node apps/worker/dist/main
else
  echo "Starting API..."
  exec node apps/api/dist/main
fi
