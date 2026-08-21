#!/bin/bash
set -e

echo "🚀 Starting TCE ERP automated production deployment..."

cd /var/www/hvac-erp

echo "📥 Fetching and resetting to latest origin/main..."
git fetch origin main
git reset --hard origin/main

echo "📦 Installing dependencies..."
npm install

echo "⚡ Generating Prisma Client..."
npx prisma generate

echo "🗄️ Applying safe database schema updates (Zero data loss)..."
npx prisma db push --skip-generate

echo "📊 Seeding canonical accounts and running idempotent historical ledger v2 backfill..."
node scripts/commit_backfill.js

echo "🏗️ Building production Next.js application..."
npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart hvac-erp || pm2 start npm --name "hvac-erp" -- start

echo "✅ Deployment completed successfully!"
