#!/bin/bash
set -e

APP_NAME="lanternwave"

echo "----------------------------------------"
echo "🚀 Deploying $APP_NAME"
echo "----------------------------------------"

echo "🛑 Stopping existing app..."
pm2 stop $APP_NAME || true

echo "🧹 Removing old build..."
rm -rf .next

echo "📦 Installing dependencies..."
npm install

echo "🏗️  Building app..."
npm run build

echo "🚀 Starting app..."
pm2 start npm --name "$APP_NAME" -- start

echo "✅ Deployment complete!"

