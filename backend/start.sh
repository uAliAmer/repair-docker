#!/bin/sh
set -e

echo "🚀 Starting Repair Tracker Backend..."
echo ""

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check if migrations were successful
if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
  echo ""
else
  echo "❌ Migration failed!"
  exit 1
fi

# Run database seed
echo "🌱 Seeding database with default users..."
npm run prisma:seed

# Check if seed was successful
if [ $? -eq 0 ]; then
  echo "✅ Database seed completed"
  echo ""
else
  echo "⚠️  Seed failed, but continuing (users may already exist)"
  echo ""
fi

# Start the application
echo "🎯 Starting application server..."
echo ""
exec node src/server.js
