#!/bin/bash
set -e

echo "🚀 Starting TCE ERP automated production deployment..."

cd /var/www/hvac-erp

echo "📥 Pulling latest codebase from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "⚡ Generating Prisma Client..."
npx prisma generate

echo "🗄️ Applying safe database schema updates (Zero data loss)..."
npx prisma db push --skip-generate

echo "🏗️ Building production Next.js application..."
npm run build

echo "🔄 Restarting PM2 process..."
pm2 restart hvac-erp || pm2 start npm --name "hvac-erp" -- start

echo "✅ Deployment completed successfully!"
