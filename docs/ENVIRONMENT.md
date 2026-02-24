# Environment Variables

This document lists all environment variables used by Glanus.

## Required Variables

### Database

```bash
# PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/glanus"
```

### Authentication & Sessions

```bash
# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Redis (Session Storage & Rate Limiting)
REDIS_URL="redis://localhost:6379"
```

### AI Features

```bash
# OpenAI API
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo-preview" # or gpt-4o, gpt-3.5-turbo
```

## Optional Variables

### Email / Notifications (SendGrid)

```bash
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@glanus.com"
ALERT_FROM_EMAIL="alerts@glanus.com"
```

### Payments (Stripe)

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Server-side environment variables for plans
STRIPE_PRICE_PERSONAL="price_..."
STRIPE_PRICE_TEAM="price_..."
STRIPE_PRICE_ENTERPRISE="price_..."

# Client-side exposed variables for pricing table
NEXT_PUBLIC_STRIPE_PRICE_PERSONAL="price_..."
NEXT_PUBLIC_STRIPE_PRICE_TEAM="price_..."
```

### Security & Hardening

```bash
CSRF_SECRET="your-csrf-secret"          # Generate with: openssl rand -hex 32
CRON_SECRET="your-cron-secret"          # Secret to authenticate internal CRON jobs
SESSION_TIMEOUT_HOURS="24"              # Session validity duration
MAX_LOGIN_ATTEMPTS="5"                  # Brute force protection limit
LOCKOUT_DURATION_MINUTES="15"           # Lockout time after max attempts
```

### System Configuration

```bash
# General application configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Infrastructure paths
GLANUS_SSH_KEYS_PATH="/app/ssh_keys"    # Path where Agent SSH keys are stored
```

## Development vs Production

### Development (.env.local)

```bash
NODE_ENV="development"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/glanus_dev"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

### Production (.env.production)

```bash
NODE_ENV="production"
DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/glanus"
REDIS_URL="redis://prod-redis.example.com:6379"
NEXTAUTH_URL="https://glanus.example.com"
NEXT_PUBLIC_APP_URL="https://glanus.example.com"
NEXT_PUBLIC_API_URL="https://glanus.example.com/api"
```

## Generating Secrets

```bash
# NEXTAUTH_SECRET and CSRF_SECRET
openssl rand -base64 32

# Database encryption key (if needed)
openssl rand -hex 32

# JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Validation

To validate your environment setup:

```bash
# Check all required variables are set
npm run check:env

# Or manually
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL ? '✓ DATABASE_URL' : '✗ DATABASE_URL missing')"
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different secrets** for development and production
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use environment-specific values** (different API keys per environment)
5. **Store secrets securely** (use AWS Secrets Manager, Vault, Kubernetes Secrets, etc. in production)
