#!/bin/bash

# Glanus Database Setup Script
# This script initializes the PostgreSQL database for Glanus

set -e

echo "🔧 Glanus Database Setup"
echo "========================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  Please update DATABASE_URL in .env with your PostgreSQL credentials"
    echo ""
fi

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL CLI (psql) not found in PATH"
    echo ""
    echo "📝 Please install PostgreSQL or add it to your PATH:"
    echo "   - Homebrew: brew install postgresql@14"
    echo "   - Postgres.app: Add /Applications/Postgres.app/Contents/Versions/latest/bin to PATH"
    echo "   - Or use Docker: docker run --name glanus-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14"
    echo ""
    read -p "Press Enter once PostgreSQL is available, or Ctrl+C to exit..."
fi

# Generate Prisma Client
echo ""
echo "📦 Generating Prisma Client..."
npm run prisma:generate

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npm run prisma:migrate:dev --name init

# Seed database
echo ""
echo "🌱 Seeding database with demo data..."
npm run db:seed

echo ""
echo "✅ Database setup complete!"
echo ""
echo "🎉 You can now start the development server with: npm run dev"
echo ""
echo "Demo accounts:"
echo "  Admin:    admin@glanus.com / admin123"
echo "  IT Staff: staff@glanus.com / staff123"
echo "  User:     john@glanus.com / user123"
echo ""
