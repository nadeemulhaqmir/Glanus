# Glanus

A unified IT operations platform combining remote desktop capabilities with comprehensive asset management, enhanced by AI.

## Features

- 🖥️ **Remote Desktop Access** — Remote session management with WebRTC signaling infrastructure
- 📦 **Asset Management** — Full lifecycle tracking for physical and digital assets with dynamic categories
- 🏢 **Multi-Workspace** — Isolated workspaces with role-based membership (Owner → Admin → Member → Viewer)
- 🤖 **AI Engines** — NERVE (data enrichment), CORTEX (causal reasoning), ORACLE (failure prediction), REFLEX (automation rules) — powered by OpenAI
- 💳 **Subscription Billing** — Stripe-powered plans with quota enforcement (Free / Personal / Team / Enterprise)
- 📊 **Analytics Dashboard** — Real-time metrics, activity feeds, and workspace-scoped insights
- 🛡️ **Agent Monitoring** — Cross-platform Tauri agent for system monitoring and remote script execution
- 🌙 **Dark Mode** — Purpose-built dark UI with the Glanus design system

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Prisma ORM 6 |
| **Database** | PostgreSQL 14+ |
| **Cache** | Redis 6+ (rate limiting) |
| **Real-time** | WebRTC (signaling infrastructure) |
| **AI** | OpenAI API (GPT-4) |
| **Auth** | NextAuth.js with CSRF protection |
| **Billing** | Stripe (subscriptions, webhooks with idempotency) |
| **Monitoring** | Sentry, Winston structured logging |
| **CI/CD** | GitHub Actions |
| **Agent** | Tauri 2.x, Rust — see [glanus-agent/](./glanus-agent/) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Pages/UI │  │ API Routes│  │  Middleware    │  │
│  │ (React)  │  │ (REST)   │  │ • Auth        │  │
│  │          │  │          │  │ • CSRF        │  │
│  └──────────┘  └──────────┘  │ • Rate Limit  │  │
│                              │ • CORS        │  │
│                              │ • CSP         │  │
│                              └───────────────┘  │
├─────────────────────────────────────────────────┤
│  lib/                                            │
│  ├── api/        → Response helpers, auth MW     │
│  ├── security/   → CSRF, rate limiting, quotas   │
│  ├── workspace/  → Audit logging, access control │
│  └── logger.ts   → Winston structured logging    │
├─────────────────────────────────────────────────┤
│  Prisma ORM → PostgreSQL    Redis (rate limits)  │
└─────────────────────────────────────────────────┘
```

## Security

- **CSP** — Strict Content Security Policy (`unsafe-inline` allowed for Next.js hydration; no `unsafe-eval` in production)
- **CSRF** — Token-based protection on all mutating requests
- **Rate Limiting** — Redis-backed with in-memory fallback (configurable per endpoint)
- **Subscription Quotas** — Enforced asset, member, and AI credit limits per plan
- **CORS** — Configurable allowed origins via `CORS_ALLOWED_ORIGINS` environment variable
- **HSTS** — Strict Transport Security enabled
- **Request Tracing** — Unique `x-request-id` on every response
- **Webhook Idempotency** — Stripe events deduplicated via `StripeEvent` model
- **Audit Logging** — Workspace-level activity tracking for compliance

## Getting Started

### Prerequisites

- Node.js **22+** and npm
- PostgreSQL 14+
- Redis 6+ (optional — falls back to in-memory rate limiting)

### Installation

```bash
# Clone
git clone https://github.com/h-khalid-h/glanus.git
cd glanus

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — see .env.example for documentation

# Database setup
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Credentials

| User | Email | Password |
|------|-------|----------|
| Admin | admin@glanus.com | password123 |
| User | john@glanus.com | password123 |

### Docker

```bash
docker compose up -d
```

See `docker-compose.yml` for the full stack (app + PostgreSQL + Redis).

## API

All API responses follow a standardized format:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req_abc123" }
}
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check + readiness probe |
| `GET /api/workspaces/:id` | Workspace details (reference implementation) |
| `GET /api/assets` | Paginated asset list (workspace-scoped) |
| `POST /api/assets` | Create asset (rate-limited, quota-enforced) |
| `GET /api/assets/export` | CSV export |
| `POST /api/cron/*` | Cron jobs (requires `CRON_SECRET` bearer token) |

## Components

### Web Application
The main platform providing remote desktop, asset management, billing, and analytics.

### Glanus Agent
Cross-platform monitoring agent built with Tauri and Rust:
- System monitoring (CPU, RAM, Disk, Network)
- Remote script execution (PowerShell, Bash, Python)
- Auto-update system
- Available for Windows, macOS, and Linux

See [glanus-agent/README.md](./glanus-agent/README.md) for details.

## License

AGPL-3.0 License — see LICENSE file for details.
