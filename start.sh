#!/bin/bash

echo "🚀 Starting Web Crawler..."

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "▶️ Starting application..."
exec node dist/index.js