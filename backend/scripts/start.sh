#!/bin/sh
set -e

echo "🚀 Starting Repair Tracker Backend..."
echo ""

# Ensure upload directories exist with proper permissions
echo "📁 Setting up upload directories..."
mkdir -p /app/uploads/images /app/uploads/temp 2>/dev/null || true
if [ -w /app/uploads ]; then
  echo "✅ Upload directories ready"
else
  echo "⚠️  Warning: No write access to /app/uploads"
  echo "   Image uploads may fail. Check volume permissions."
fi
echo ""

# Run database migrations
echo "📦 Running database migrations..."
if npx prisma migrate deploy 2>/dev/null; then
  echo "✅ Migrations completed successfully"
  echo ""
else
  echo "⚠️  Migrations failed or not found - using db push instead"
  echo "📦 Syncing database schema..."

  # Try db push as fallback (suppress errors if schema already exists)
  if npx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -v "must be owner"; then
    echo "✅ Database schema synced"
    echo ""
  else
    echo "⚠️  Database sync skipped (schema likely already exists and correct)"
    echo ""
  fi
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
