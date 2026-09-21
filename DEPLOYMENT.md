# Deployment guide

This document covers the production environment variables and deployment expectations for Princess & Brothers.

## Required environment variables

Set the following variables in your deployment environment, secret manager, or Vercel/Cloud Run/AWS ECS config before shipping.

- `DATABASE_URL`: PostgreSQL connection string for Prisma.
- `REDIS_URL`: Redis URL used for session revocation and active session checks.
- `AUTH_JWT_SECRET`: Secret used to sign access tokens. Must be at least 32 characters.
- `APP_URL`: Public URL for the storefront and portal app, such as `https://www.princesbrothers.com`.
- `FX_RATES_JSON`: Optional JSON override for local FX rates used by payment context.
- `STRIPE_SECRET_KEY`: Secret key for Stripe payment flows.
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret for Stripe events.
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: PayPal credentials for international payment routing.
- `PAYSTACK_SECRET_KEY`: PayStack API key for African-market checkouts.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`: Optional SMS OTP for driver or customer login flows.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: Email delivery for contributor approval notices and order confirmations.
- `SENTRY_DSN`: Optional monitoring and error reporting endpoint.

## Recommended deployment layout

- Web app: Next.js server deployment
- Database: managed PostgreSQL instance
- Cache/session store: managed Redis
- Static assets: CDN or S3-backed delivery
- Secrets: environment or secret manager, never committed to source control

## Production checklist

1. Set `DATABASE_URL` to the production database and run Prisma migrations.
2. Set `REDIS_URL` to the production Redis instance.
3. Generate a strong `AUTH_JWT_SECRET` and rotate it during release windows.
4. Configure payment providers and webhook endpoints for Stripe, PayPal, and Paystack.
5. Confirm `APP_URL` matches the public domain used by login redirects and cookie policies.
6. Run the CI checks before deployment: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
7. Verify database connectivity, Redis health, and SMTP delivery before enabling production checkout.

## Example .env block

```bash
DATABASE_URL="postgresql://postgres:postgres@host:5432/princess_and_brothers?schema=public"
REDIS_URL="redis://host:6379"
AUTH_JWT_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
APP_URL="https://www.princesbrothers.com"
FX_RATES_JSON='{"USD":1,"RWF":1350,"KES":129,"UGX":3700,"TZS":2500,"BIF":2900,"NGN":1600,"GHS":15,"ZAR":18}'
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYSTACK_SECRET_KEY="..."
```

For local development, copy `.env.example` to `.env` and use the bundled `docker-compose.yml` setup to start Postgres and Redis in containers.
