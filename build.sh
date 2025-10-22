#!/bin/bash

# Build script for Render deployment
echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Verify dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not created!"
    exit 1
fi

# Verify index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found!"
    exit 1
fi

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install chromium

echo "✅ Build completed successfully!"
echo "📁 Files in dist directory:"
ls -la dist/