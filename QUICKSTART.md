# Glanus Platform - Quick Start Guide

## 📋 Prerequisites

- **Node.js** 22+ and npm
- **PostgreSQL** 14+ (running on localhost:5432)
- **Redis** 6+ (optional, for future features)

## 🚀 Getting Started

### 1. Database Setup

First, create the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE glanus;

# Exit psql
\q
```

### 2. Environment Configuration

The `.env` file is already configured with defaults. Update if needed:

```bash
# Database connection (update username/password if different)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glanus"

# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="change-this-to-a-random-secret-in-production-use-openssl-rand-base64-32"

# OpenAI API Key (optional - only needed for AI features)
OPENAI_API_KEY=""
```

### 3. Initialize Database

Run migrations and seed demo data:

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Seed demo data
npm run db:seed
```

This will create:
- 4 demo users (1 Admin, 3 regular users)
- 5 sample assets (laptops, server, phone, SaaS subscription)

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@glanus.com | password123 |
| IT Staff | staff@glanus.com | password123 |
| User | john@glanus.com | password123 |
| User | jane@glanus.com | password123 |

## 📁 Project Structure

```
glanus/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── dashboard/     # Dashboard data
│   │   └── ai/            # AI features
│   ├── dashboard/         # Protected dashboard pages
│   ├── login/             # Login page
│   └── page.tsx           # Landing page
├── components/             # React components
│   ├── ui/                # UI components
│   ├── AuthGuard.tsx      # Route protection
│   ├── DashboardNav.tsx   # Navigation
│   └── SessionProvider.tsx
├── lib/                    # Utilities
│   ├── ai/                # OpenAI integration
│   ├── auth.ts            # NextAuth config
│   ├── db.ts              # Prisma client
│   └── utils.ts           # Helper functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
└── types/                  # TypeScript types
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev  # Run migrations
npm run db:seed          # Seed database

# Quality
npm run type-check       # TypeScript check
npm run lint             # ESLint check
```

## ✨ Features Implemented

### ✅ Core Platform
- Next.js 14 with TypeScript
- PostgreSQL with Prisma ORM
- Tailwind CSS with custom design system
- Dark mode support

### ✅ Authentication
- NextAuth.js credentials provider
- Protected routes with AuthGuard
- Session management
- User roles (Admin, IT Staff, User)
- Audit logging

### ✅ Dashboard
- Real-time statistics
- Recent assets view
- Active sessions monitoring
- AI insights display
- Navigation with user info

### ✅ Database Models
- Users with roles
- Assets with assignment tracking
- Remote sessions logging
- AI insights storage
- Audit trails

### ✅ AI Integration
- OpenAI client setup
- Auto-categorization endpoint
- Prompt templates for 5 AI features
- Lazy initialization (works without API key)

## 🚧 Next Steps

To expand the platform, consider adding:

1. **Full Asset Management** - CRUD operations for assets
2. **Remote Desktop Client** - WebRTC viewer component
3. **More AI Features** - Health predictions, anomaly detection, support chatbot
4. **User Management** - Admin panel for user administration
5. **Reports** - Asset reports and analytics
6. **API Documentation** - Swagger/OpenAPI docs

## 🐛 Troubleshooting

### Database Connection Error
```
Can't reach database server at localhost:5432
```
**Solution**: Ensure PostgreSQL is running:
```bash
# macOS (Homebrew)
brew services start postgresql@14

# Or check if it's running
psql -U postgres -c "SELECT version();"
```

### Prisma Migration Fails
```
Environment variable not found: DATABASE_URL
```
**Solution**: Ensure `.env` file exists in the project root with `DATABASE_URL` set.

### Build Fails
```
Module not found or type errors
```
**Solution**: Regenerate Prisma client and check types:
```bash
npm run prisma:generate
npm run type-check
```

## 📝 Notes

- The platform is configured for local development
- OpenAI API key is optional - AI features will be disabled without it
- All passwords in seed data use bcrypt hashing
- Session strategy is JWT-based for scalability

For production deployment, remember to:
- Generate a secure `NEXTAUTH_SECRET`
- Use environment-based database URLs
- Enable HTTPS
- Configure proper CORS
- Set up proper logging and monitoring
