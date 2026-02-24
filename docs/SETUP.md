# Glanus - Setup Instructions

## Database Setup Options

You have several options to set up the PostgreSQL database:

### Option 1: Automated Setup Script (Recommended)

```bash
./scripts/setup-db.sh
```

This script will:
- Generate Prisma client
- Run database migrations
- Seed demo data
- Provide helpful error messages if PostgreSQL is not found

### Option 2: Manual Setup

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # Using Homebrew
   brew install postgresql@14
   brew services start postgresql@14
   
   # Or using Docker
   docker run --name glanus-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     -d postgres:14
   ```

2. **Create database**:
   ```bash
   # Create database
   createdb -U postgres glanus
   
   # Or using psql
   psql -U postgres -c "CREATE DATABASE glanus;"
   ```

3. **Run setup commands**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate:dev
   npm run db:seed
   ```

### Option 3: Using Postgres.app (macOS)

1. Download and install [Postgres.app](https://postgresapp.com/)
2. Add to PATH:
   ```bash
   echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
3. Run the setup script:
   ```bash
   ./scripts/setup-db.sh
   ```

## Starting the Platform

Once database is set up:

```bash
npm run dev
```

Open http://localhost:3000 and login with:
- **Admin**: admin@glanus.com / admin123

## Troubleshooting

### "command not found: psql"
- PostgreSQL CLI is not in your PATH
- Install PostgreSQL or use Docker option above

### "Can't reach database server"
- Ensure PostgreSQL is running:
  ```bash
  brew services list | grep postgresql
  # or
  docker ps | grep postgres
  ```

### "Database already exists"
- That's fine! Just run migrations:
  ```bash
  npm run prisma:migrate:dev
  npm run db:seed
  ```

### Migration conflicts
- Reset database (WARNING: deletes all data):
  ```bash
  npm run prisma:migrate:reset
  ```

## Next Steps

After setup, explore:
- 📊 Dashboard at `/dashboard`
- 🔐 Try different user roles
- 🤖 AI features (requires OpenAI API key)
- 📦 Asset management
- 🖥️ Remote sessions

See [QUICKSTART.md](./QUICKSTART.md) for full documentation.
