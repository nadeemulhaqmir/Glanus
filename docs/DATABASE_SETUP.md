# Database Setup - Installation Guide

## Current Status
Neither Homebrew nor PostgreSQL was detected on this system.

## Recommended Setup Options

### Option 1: Install Homebrew (Easiest for macOS)

Homebrew is a package manager that makes it easy to install PostgreSQL and other tools.

1. **Install Homebrew**:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Then install PostgreSQL**:
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

3. **Run setup**:
   ```bash
   cd /Users/hkhalid/Codebases/Glanus
   ./scripts/setup-db.sh
   ```

### Option 2: Install Docker (Recommended for Development)

Docker provides an isolated PostgreSQL instance without affecting your system.

1. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Run PostgreSQL container**:
   ```bash
   docker run --name glanus-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_DB=glanus \
     -p 5432:5432 \
     -d postgres:14
   ```

3. **Run setup** (database will be auto-created):
   ```bash
   cd /Users/hkhalid/Codebases/Glanus
   npm run prisma:generate
   npm run prisma:migrate:dev
   npm run db:seed
   ```

### Option 3: Postgres.app (macOS GUI)

A native macOS app for PostgreSQL.

1. **Download and install**:
   - Get from: https://postgresapp.com/
   - Drag to Applications folder
   - Open and click "Initialize"

2. **Add to PATH** (add to ~/.zshrc):
   ```bash
   export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
   ```

3. **Reload shell and run setup**:
   ```bash
   source ~/.zshrc
   cd /Users/hkhalid/Codebases/Glanus
   ./scripts/setup-db.sh
   ```

### Option 4: Use SQLite (Quick Start)

For quick testing without PostgreSQL:

1. **Update Prisma schema** to use SQLite:
   ```bash
   # This requires manual editing of prisma/schema.prisma
   # Change provider from "postgresql" to "sqlite"
   # Change url to "file:./dev.db"
   ```

2. **Run migrations**:
   ```bash
   npm run prisma:migrate:dev
   npm run db:seed
   ```

**Note**: Some features may behave differently with SQLite.

## After Installation

Once you've chosen and completed one of the above options, run:

```bash
npm run dev
```

Then open http://localhost:3000 and login with:
- **Email**: admin@glanus.com
- **Password**: admin123

## Need Help?

If you encounter issues:
1. Check that PostgreSQL is running: `docker ps` or `brew services list`
2. Verify connection in .env file matches your setup
3. Try manual database creation: `createdb -U postgres glanus`

See [QUICKSTART.md](./QUICKSTART.md) for more details.
