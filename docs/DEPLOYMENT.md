# Deployment Guide

Complete guide for deploying Glanus to production.

## Prerequisites

- Domain name
- SSL certificate (or use Let's Encrypt)
- PostgreSQL database (managed service recommended)
- Redis instance (managed service recommended)
- Node.js 18+ on production server

## Deployment Options

### Option 1: Vercel (Recommended for Web App)

**Advantages**:
- Automatic HTTPS
- Global CDN
- Zero-config deployment
- Automatic scaling

**Steps**:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add all required variables from `docs/ENVIRONMENT.md`

4. Database migrations:
```bash
vercel env pull .env.production
npm run prisma:migrate:deploy
```

### Option 2: Docker (Self-Hosted)

**Advantages**:
- Full control
- Works anywhere
- Reproducible

**Steps**:

1. Build image:
```bash
docker build -t glanus:latest .
```

2. Run with docker-compose:
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: glanus:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: glanus
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

3. Start:
```bash
docker-compose up -d
```

### Option 3: Traditional VPS

**Requirements**:
- Ubuntu 22.04 LTS or similar
- 2GB+ RAM
- Nginx or Caddy

**Steps**:

1. Install dependencies:
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (process manager)
sudo npm install -g pm2

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Redis
sudo apt-get install -y redis-server
```

2. Clone and build:
```bash
git clone https://github.com/your-org/glanus.git
cd glanus
npm install
npm run build
```

3. Set up environment:
```bash
cp .env.example .env.production
nano .env.production
# Fill in production values
```

4. Run migrations:
```bash
npm run prisma:migrate:deploy
```

5. Start with PM2:
```bash
pm2 start npm --name "glanus" -- start
pm2 save
pm2 startup
```

6. Configure Nginx:
```nginx
server {
    listen 80;
    server_name glanus.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. Get SSL with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d glanus.example.com
```

## Database Setup

### Managed Services (Recommended)

**Options**:
- [Supabase](https://supabase.com) - PostgreSQL (free tier available)
- [Railway](https://railway.app) - PostgreSQL + Redis
- [Render](https://render.com) - PostgreSQL
- [AWS RDS](https://aws.amazon.com/rds/) - PostgreSQL (production)

**After setup**:
1. Get connection string
2. Add to `DATABASE_URL` environment variable
3. Run migrations: `npm run prisma:migrate:deploy`

### Self-Hosted PostgreSQL

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE glanus;
CREATE USER glanus_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE glanus TO glanus_user;
\q

# Update DATABASE_URL
DATABASE_URL="postgresql://glanus_user:secure_password@localhost:5432/glanus"
```

## Agent Distribution

### Option 1: GitHub Releases (Recommended)

1. Tag release:
```bash
git tag v0.1.0
git push origin v0.1.0
```

2. GitHub Actions builds installers automatically

3. Update database:
```bash
cd Glanus
psql -d glanus -f prisma/seeds/seed_agent_versions.sql
```

4. Generate checksums:
```bash
cd glanus-agent/installers
../../../prisma/seeds/generate_checksums.sh
```

5. Update `seed_agent_versions.sql` with real checksums

6. Re-seed database

### Option 2: S3/CDN Distribution

1. Upload installers to S3:
```bash
aws s3 cp glanus-agent-0.1.0.msi s3://glanus-agents/v0.1.0/
aws s3 cp glanus-agent-0.1.0.pkg s3://glanus-agents/v0.1.0/
aws s3 cp glanus-agent_0.1.0_amd64.deb s3://glanus-agents/v0.1.0/
```

2. Update `downloadUrl` in database:
```sql
UPDATE "AgentVersion"
SET "downloadUrl" = 'https://cdn.glanus.com/agents/v0.1.0/glanus-agent-0.1.0.msi'
WHERE platform = 'WINDOWS' AND version = '0.1.0';
```

## Post-Deployment Checklist

- [ ] SSL certificate is valid and auto-renewing
- [ ] Database backups are configured
- [ ] Redis persistence is enabled
- [ ] All environment variables are set
- [ ] Application logs are being collected
- [ ] Monitoring is set up (Sentry, DataDog, etc.)
- [ ] Agent installers are accessible
- [ ] `/download-agent` page loads correctly
- [ ] Test agent registration flow
- [ ] Test remote desktop connection
- [ ] Configure firewall rules
- [ ] Set up CDN (Cloudflare) for static assets
- [ ] Enable rate limiting
- [ ] Test backup/restore procedure

## Monitoring

### Application Logs

**PM2**:
```bash
pm2 logs glanus
pm2 logs glanus --lines 100
```

**Docker**:
```bash
docker-compose logs -f app
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Health Checks

Create a health check endpoint and monitor:

```bash
# Every 5 minutes
*/5 * * * * curl -f https://glanus.example.com/api/health || echo "Health check failed"
```

## Scaling

### Horizontal Scaling

1. Deploy multiple instances behind load balancer
2. Use Redis for session sharing
3. Use PostgreSQL read replicas for reads

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database with indexes
- Enable query caching
- Use CDN for static assets

## Backup & Recovery

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump glanus | gzip > /backups/glanus_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "glanus_*.sql.gz" -mtime +30 -delete
```

### Recovery

```bash
# Restore from backup
gunzip < glanus_20260216.sql.gz | psql glanus
```

## Troubleshooting

### App won't start

```bash
# Check logs
pm2 logs glanus --err

# Check environment
pm2 env glanus

# Restart
pm2 restart glanus
```

### Database connection issues

```bash
# Test connection
psql $DATABASE_URL

# Check connection limits
SELECT max_connections FROM pg_settings WHERE name = 'max_connections';
```

### High memory usage

```bash
# Check Node.js memory
pm2 describe glanus

# Increase if needed
pm2 start npm --name glanus --max-memory-restart 1G -- start
```

## Security Hardening

1. **Firewall**: Only open ports 80, 443, 22
2. **SSH**: Disable password auth, use keys only
3. **Fail2ban**: Install to prevent brute force
4. **Updates**: Enable automatic security updates
5. **HTTPS**: Force HTTPS, use HSTS headers
6. **Rate Limiting**: Implement on API endpoints
7. **CSP**: Configure Content Security Policy headers

## Support

For deployment support:
- Documentation: `docs/`
- Issues: GitHub Issues
- Email: devops@glanus.com
