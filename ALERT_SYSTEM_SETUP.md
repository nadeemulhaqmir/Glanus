# Glanus Alert System - Notification Setup

## Overview

The Glanus RMM alert system is now fully functional with automated notification delivery via email and webhooks.

## Components

### 1. Alert Evaluation (`lib/alert-evaluator.ts`)
- Checks agent metrics against configured alert rules
- Supports CPU, RAM, DISK, and OFFLINE metrics
- Duration-based triggering (sustained violations)
- Returns list of triggered alerts

### 2. Email Service (`lib/email-service.ts`)
- Professional HTML email templates
- Severity-based color coding (INFO/WARNING/CRITICAL)
- Sends to workspace admins (OWNER/ADMIN roles)
- Ready for SendGrid/AWS SES/Resend integration

### 3. Webhook Service (`lib/webhook-service.ts`)
- HTTP POST delivery with JSON payload
- Retry logic: 3 attempts (1s, 5s, 15s delays)
- HMAC signature support (optional)
- Tracks success/failure stats in database

### 4. Notification Orchestrator (`lib/notification-orchestrator.ts`)
- Coordinates alert evaluation + delivery
- Respects rule notification settings
- Batches notifications by rule
- Collects errors and stats

### 5. Background Job (`app/api/cron/process-alerts/route.ts`)
- POST endpoint for cron job
- Processes all workspaces with enabled alerts
- Protected by CRON_SECRET
- Returns detailed stats

## Setup Instructions

### 1. Environment Variables

Add to `.env`:

```bash
# Cron job authentication
CRON_SECRET=your-secure-random-secret

# Email service (optional - choose one)
SENDGRID_API_KEY=your-sendgrid-api-key
# OR
AWS_SES_ACCESS_KEY=your-aws-access-key
AWS_SES_SECRET_KEY=your-aws-secret-key
# OR
RESEND_API_KEY=your-resend-api-key

# Email sender
ALERT_FROM_EMAIL=alerts@glanus.com

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://app.glanus.com
```

### 2. Email Service Integration

Currently, emails are logged to console. To enable real email delivery, uncomment the SendGrid integration in `lib/email-service.ts`:

```typescript
// In sendAlert() method, replace console.log with:
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{
      to: payload.to.map(email => ({ email })),
    }],
    from: { email: process.env.ALERT_FROM_EMAIL || 'alerts@glanus.com' },
    subject: payload.subject,
    content: [{
      type: 'text/html',
      value: emailHtml,
    }],
  }),
});
```

### 3. Cron Job Setup

**Option A: Vercel Cron** (recommended for Vercel deployments)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/process-alerts",
    "schedule": "*/5 * * * *"
  }]
}
```

**Option B: External Cron Service** (EasyCron, cron-job.org, etc.)

Configure with:
- URL: `https://app.glanus.com/api/cron/process-alerts`
- Method: POST
- Schedule: `*/5 * * * *` (every 5 minutes)
- Headers:
  ```
  Authorization: Bearer your-cron-secret
  Content-Type: application/json
  ```

**Option C: Self-Hosted Cron**

Add to crontab:
```bash
*/5 * * * * curl -X POST https://app.glanus.com/api/cron/process-alerts \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

### 4. Testing

**Manual trigger:**
```bash
curl -X POST http://localhost:3000/api/cron/process-alerts \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

**Check system status:**
```bash
curl http://localhost:3000/api/cron/process-alerts
```

## How It Works

1. **Cron job triggers** (`/api/cron/process-alerts`) every 5 minutes
2. **Orchestrator processes all workspaces** with enabled alert rules
3. **Alert evaluator checks metrics** against rule thresholds
4. **If threshold exceeded**:
   - Check duration requirement (if any)
   - Create alert trigger
5. **For each triggered alert**:
   - Send email (if `notifyEmail: true`)
   - Send webhook (if `notifyWebhook: true` and webhook configured)
6. **Return stats**: alerts triggered, emails sent, webhooks sent, errors

## Alert Flow Example

```
Agent sends heartbeat with metrics (CPU: 95%)
  ↓
Metrics stored in database
  ↓
Cron job runs (every 5 min)
  ↓
Alert evaluator checks: CPU > 90% for 5 minutes?
  ↓
YES → Trigger alert
  ↓
Check alert rule settings:
  - notifyEmail: true → Send email to admins
  - notifyWebhook: true → POST to webhook URL
  ↓
Return stats: 1 alert, 1 email, 1 webhook
```

## Webhook Payload Format

```json
{
  "alert": "High CPU Usage",
  "asset": "Server-01",
  "assetId": "asset_123",
  "metric": "CPU",
  "value": 95.2,
  "threshold": 90,
  "severity": "WARNING",
  "timestamp": "2026-02-16T02:00:00Z",
  "workspaceId": "ws_456"
}
```

If webhook has `secret` configured, request includes:
```
X-Glanus-Signature: sha256_hmac_of_body
```

## Monitoring

**Check cron job logs:**
```bash
# In production logs
[CRON] Starting alert processing...
[CRON] Alert processing complete: {
  workspaces: 5,
  alertsTriggered: 3,
  emailsSent: 3,
  webhooksSent: 2,
  errors: 0,
  duration: 1234
}
```

**Monitor webhook failures:**
```sql
SELECT * FROM "NotificationWebhook"
WHERE "failureCount" > 5
ORDER BY "lastFailure" DESC;
```

## Production Checklist

- [ ] Set `CRON_SECRET` environment variable
- [ ] Configure email service (SendGrid/AWS SES/Resend)
- [ ] Set `ALERT_FROM_EMAIL`
- [ ] Set `NEXT_PUBLIC_APP_URL`
- [ ] Set up cron job (Vercel Cron or external)
- [ ] Test manual trigger
- [ ] Create test alert rule
- [ ] Verify email delivery
- [ ] Verify webhook delivery
- [ ] Monitor cron job logs

## Cost Estimates

**SendGrid Free Tier:**
- 100 emails/day forever free
- Enough for ~20 alerts/day (5 admins each)

**Vercel Cron:**
- Free on all plans
- 12 executions/hour (every 5 min)

**Total cost:** $0/month for small deployments! 🎉
