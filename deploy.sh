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

echo "🔄 Reloading PM2 process with zero downtime..."
if [ -f ecosystem.config.js ]; then
  pm2 reload ecosystem.config.js --update-env || pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
else
  pm2 reload hvac-erp || pm2 restart hvac-erp || pm2 start npm --name "hvac-erp" -- start
fi

echo "✅ Deployment completed successfully with zero data loss!"

