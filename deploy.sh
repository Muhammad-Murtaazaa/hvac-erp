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

echo "🗄️ Applying safe database schema updates across all companies (Zero data loss)..."
node scripts/db_push_all.js

echo "🛡️ Ensuring developer clearance & admin users are provisioned across all companies..."
node scripts/seed_dev_user.js

echo "🏗️ Building production Next.js application..."
npm run build

echo "🔄 Reloading PM2 process..."
pm2 delete hvac-erp 2>/dev/null || true
if [ -f ecosystem.config.js ]; then
  pm2 start ecosystem.config.js
else
  pm2 start npm --name "hvac-erp" -- start
fi
pm2 save

echo "✅ Deployment completed successfully with zero data loss!"

