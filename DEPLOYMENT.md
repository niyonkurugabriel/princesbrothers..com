# Deployment guide

This document covers the production environment variables and deployment expectations for Princess & Brothers.

## Required environment variables

Set the following variables in your deployment environment, secret manager, or Vercel/Cloud Run/AWS ECS config before shipping.

- `DATABASE_URL`: MySQL connection string used by the shared `mysql2` pool.
- `AUTH_JWT_SECRET`: Secret used to sign access tokens. Must be at least 32 characters.
- `APP_URL`: Public URL for the storefront and portal app, such as `https://www.princesbrothers.com`.
- `FX_RATES_JSON`: Optional JSON override for local FX rates used by payment context.
- `STRIPE_SECRET_KEY`: Secret key for Stripe payment flows.
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret for Stripe events.
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`: PayPal credentials for international payment routing.
- `PAWAPAY_API_TOKEN`: Server-only PawaPay bearer token for MTN and Airtel deposits. Set it only on the server; never expose it in browser code.
- `PAWAPAY_API_URL`: Optional PawaPay API base URL. Defaults to `https://api.pawapay.io`; use `https://api.sandbox.pawapay.io` with a sandbox token.
- `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`: SMS verification and driver PIN recovery. Africa's Talking remains an optional alternative.
- `COMPANY_WHATSAPP_NUMBER`: International digits-only number used for manual-payment negotiation links.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`: Google OAuth login.
- `EMAIL_PROVIDER` and `EMAIL_FROM`: authentication and password-reset email delivery. For a local Postfix relay, set `EMAIL_PROVIDER=smtp`, `EMAIL_SERVER_HOST=127.0.0.1`, and `EMAIL_SERVER_PORT=25`; set both SMTP auth variables to `none` when the relay does not require authentication. For Resend, SendGrid, or Postmark, use the matching API token and verify the sender domain used by `EMAIL_FROM`.
- `SENTRY_DSN`: Optional monitoring and error reporting endpoint.
- `PRODUCT_IMAGE_STORAGE_DIR`: Required in production. Set an absolute, writable path on persistent local server storage; it contains the `products/` and `drivers/` subfolders. In development it defaults to `frontend/storage/product-images` when run from the web workspace.
- `PRODUCT_IMAGE_UPLOAD_SOURCE_DIR`: Optional directory containing old local `public/uploads/products` files for migration; defaults to `frontend/public/uploads/products` from the repository root.
- `PRODUCT_IMAGE_MIGRATION_SOURCE_BASE_URL`: Optional one-time HTTPS base URL for importing old image URLs from the previous S3-compatible setup. It is not used by runtime image uploads or reads.

## Recommended deployment layout

- Web app: Next.js server deployment
- Database and session store: managed MySQL 8 instance
- Static assets: CDN or local web-server delivery
- Product and driver profile uploads: a persistent local directory mounted at `PRODUCT_IMAGE_STORAGE_DIR`; the Next.js image route serves these files from disk. No external image provider, bucket, or CDN is required. Back up this directory with the database and share the same mount across app instances.
- Private contributor chat attachments: persistent private storage mounted at `storage/contributor-chat` (not the public web directory)
- Secrets: environment or secret manager, never committed to source control

## Production checklist

1. Set `DATABASE_URL` to the production database and run `npm run db:migrate`. Fresh databases use the single schema file `db/database_pb.sql`; existing MySQL schemas receive additive updates from the runner.
2. Generate a strong `AUTH_JWT_SECRET` and rotate it during release windows.
3. Add a PawaPay API token on the server and enable Rwanda MTN (`MTN_MOMO_RWA`) and Airtel (`AIRTEL_RWA`) deposits in the provider account. Set `PAWAPAY_API_URL` to the sandbox URL while testing.
4. Set `APP_URL` to `https://www.princesbrothers.com` and use that single canonical origin for login redirects, canonical metadata, and the sitemap. The app permanently redirects the apex host to `www`.
5. Keep the deployed `/robots.txt` in sync with `frontend/public/robots.txt`. The current production response is served by the web-server static root, so updating the Next.js source alone may not replace that copy.
6. Run the CI checks before deployment: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
7. Mount a persistent local directory and set `PRODUCT_IMAGE_STORAGE_DIR` before enabling uploads. Run `npm run images:migrate` for a dry run, then `npm run images:migrate -- --apply` to copy existing local images and update database references. If database records point to the former object store, set `PRODUCT_IMAGE_MIGRATION_SOURCE_BASE_URL` only for this one-time import; resolve missing images and verify local URLs before removing old files. Back up the image directory with MySQL.
8. Driver chat uses authenticated five-second polling and database message history; it does not require a separate WebSocket service. After deployment, verify an admin and a driver can exchange messages.
9. Verify MySQL connectivity, password-reset and invoice email delivery, Twilio SMS delivery, product/driver image uploads, and mobile-money payments before enabling production checkout. Payment completion is confirmed server-side against the PawaPay deposit status API; callback setup is not required.

### Google OAuth redirect URI

The redirect URI sent to Google must exactly match an entry under **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs** for the same client ID used by the app. For local development, add `http://localhost:3000/api/auth/google/callback` (no trailing slash) and set `GOOGLE_REDIRECT_URI` to that exact value in `.env`. For production, register and configure the exact HTTPS callback, for example `https://www.princesbrothers.com/api/auth/google/callback`. After saving the Google credential and environment values, restart the app. The app uses the configured URI for both the authorization request and the code exchange.

## Example .env block

```bash
DATABASE_URL="mysql://user:password@host:3306/princesbrothers"
APP_URL="https://www.princesbrothers.com"
AUTH_JWT_SECRET=""
FX_RATES_JSON='{"USD":1,"RWF":1350,"KES":129,"UGX":3700,"TZS":2500,"BIF":2900,"NGN":1600,"GHS":15,"ZAR":18}'
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAWAPAY_API_TOKEN="..."
PAWAPAY_API_URL="https://api.sandbox.pawapay.io"
EMAIL_PROVIDER="smtp"
EMAIL_FROM="auth@princesbrothers.com"
EMAIL_SERVER_HOST="127.0.0.1"
EMAIL_SERVER_PORT="25"
EMAIL_SERVER_USER="none"
EMAIL_SERVER_PASSWORD="none"
SMS_PROVIDER="twilio"
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
COMPANY_WHATSAPP_NUMBER="250791702041"
PRODUCT_IMAGE_STORAGE_DIR="/srv/princesbrothers/product-images"
# Optional, one-time import only:
# PRODUCT_IMAGE_MIGRATION_SOURCE_BASE_URL="https://images.example.com"
```

For local development, copy `.env.example` to `.env`, set a generated `AUTH_JWT_SECRET` of at least 32 characters, start MySQL on port 3306 (or update `DATABASE_URL` to match), create the `princesbrothers` database, and run `npm run db:migrate`.
