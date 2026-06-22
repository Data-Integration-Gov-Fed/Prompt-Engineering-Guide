#!/bin/sh
set -e
echo "==> Pushing database schema..."
npx prisma db push --accept-data-loss
echo "==> Seeding database..."
npx tsx prisma/seed.ts
echo "==> Starting FlowSwitch..."
exec npm start
