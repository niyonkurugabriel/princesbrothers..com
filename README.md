# Princess & Brothers

Full-stack e-commerce monorepo for [princesbrothers.com](https://princesbrothers.com).

## Stack

- Next.js 14 App Router and TypeScript
- Tailwind CSS
- PostgreSQL with Prisma ORM
- npm workspaces

## Repository layout

```text
apps/web       Next.js application with storefront, contributor, driver, and admin route groups
packages/db    Prisma schema and shared Prisma client
packages/ui    Shared React component library entry point
packages/config Shared TypeScript and ESLint configuration
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 14 or newer

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and update `DATABASE_URL`.
3. Generate the Prisma client: `npm run db:generate`
4. Start the web app: `npm run dev`

## Local development with Docker

Use the included `docker-compose.yml` to start the app, PostgreSQL, and Redis together:

```bash
docker compose up --build
```

The app runs on `http://localhost:3000`, PostgreSQL is exposed on `localhost:5432`, and Redis is exposed on `localhost:6379`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production environment variables and release checks.

Authentication also requires `REDIS_URL` and an `AUTH_JWT_SECRET` with at least 32 characters. Tokens are issued as `httpOnly`, `Secure`, `SameSite=Strict` cookies. The middleware performs edge-safe JWT and portal checks; server handlers should call `verifyActiveSession` with the Redis store so revoked sessions are rejected immediately.

The portal policies are encoded in `apps/web/lib/auth`: storefront sessions support password, phone OTP, Google OAuth, and guest checkout; contributors require email verification and approval; drivers accept PIN or SMS OTP sessions with a 12-hour TTL; admins require password plus TOTP and use a 15-minute session TTL.

The driver portal is available at `/driver`, with phone/PIN login at `/driver/login`. It uses large native controls, direct Google Maps links, camera capture, signature capture, and a compact single-page route workflow for low-bandwidth devices. Driver PIN hashes are stored on the `Driver` record; provision them through a trusted admin or seed flow before enabling production sign-in.

The admin dashboard is available at `/admin/dashboard` and is gated by the MFA-verified admin middleware policy. Catalog, fulfillment, partner review, RBAC, audit, and active-session views currently use typed dummy query data in `apps/web/lib/admin/data.ts`. Mutations route through `mutateAdmin()` and `logAuditEvent()`; replace the dummy updates with Prisma writes while preserving that audit call.

Checkout payment context is resolved by `apps/web/lib/payment-context.ts`. It checks Cloudflare (`cf-ipcountry`), AWS CloudFront (`cloudfront-viewer-country`), and generic country headers, then applies the `pb_currency` session cookie as a manual override. FX rates are cached in process for five minutes and can be supplied through `FX_RATES_JSON`. Gateway availability is regional, and each checkout transaction writes its base amount, converted amount, currency, FX rate, gateway, region, and timestamp to `AuditLog` metadata.

The initial route scaffolds are available at `/` for the storefront, `/portal` for the contributor and driver portals, and `/dashboard` for the admin portal.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Typechecking is required for the web, database, and shared UI workspaces. CI runs each workspace explicitly and fails on the first type error.

No business logic or database models have been added yet.