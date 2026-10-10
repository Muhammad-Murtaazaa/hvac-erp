#!/bin/bash
set -e

echo "🚀 Starting HVAC ERP automated multi-system production deployment..."

cd /var/www/hvac-erp

echo "📥 Fetching and resetting to latest origin/main..."
git fetch origin main
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install

echo "⚡ Generating Prisma Client..."
npx prisma generate

# Source environment variables if .env exists so bash can inspect DATABASE_URL_TECAIR
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs -d '\n') 2>/dev/null || true
fi

echo "🗄️ Applying safe database schema updates to TCE database (Zero data loss)..."
npx prisma db push --skip-generate

# Ensure TECAIR database schema is also synchronized
TECAIR_URL="${DATABASE_URL_TECAIR:-}"
if [ -z "$TECAIR_URL" ] && [ -n "$DATABASE_URL" ]; then
  TECAIR_URL="${DATABASE_URL/\/neondb/\/tecair}"
  TECAIR_URL="${TECAIR_URL/\/hvac_erp/\/tecair}"
fi

if [ -n "$TECAIR_URL" ]; then
  echo "🗄️ Applying safe database schema updates to TECAIR database (Zero data loss)..."
  DATABASE_URL="$TECAIR_URL" npx prisma db push --skip-generate
fi

echo "🛡️ Ensuring developer clearance & admin users are provisioned across all companies..."
node scripts/seed_dev_user.js

echo "🏗️ Building production Next.js application..."
npm run build

echo "🔄 Reloading PM2 process with zero downtime..."
if [ -f ecosystem.config.js ]; then
  pm2 reload ecosystem.config.js --update-env || pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
else
  pm2 reload hvac-erp || pm2 restart hvac-erp || pm2 start npm --name "hvac-erp" -- start
fi

echo "✅ Deployment completed successfully with zero data loss!"

