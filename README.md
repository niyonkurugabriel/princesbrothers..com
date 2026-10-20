# Princess & Brothers

Full-stack e-commerce monorepo for [princesbrothers.com](https://princesbrothers.com).

## Stack

- Next.js 15 App Router and TypeScript
- Tailwind CSS
- MySQL with parameterized `mysql2` queries
- npm workspaces

## Repository layout

```text
frontend/app/           Next.js routes, layouts, API handlers, and server actions
frontend/features/      Admin, auth, contributor, driver, payments, and storefront code
frontend/shared/        Utilities shared across features
frontend/middleware.ts  Authentication and portal route protection
db/                     MySQL connection, SQL migrations, seed, and CRUD smoke test
packages/db/            Typed exports for the shared mysql2 connection
packages/ui/            Shared React component library
packages/config/        Shared TypeScript and ESLint configuration
scripts/                Local development checks
```

Feature code lives under `frontend/features/<name>/`: `components/` contains UI and `server/` contains server-side data access. Next.js route files stay in `frontend/app/` and import feature code using the `@/` alias.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MySQL 8 or newer, listening on the port configured in `DATABASE_URL` (3306 by default)

## Local Setup

1. Start MySQL 8 on port `3306` and create the `princesbrothers` database. For example: `mysql --host=127.0.0.1 --port=3306 --user=root -p --execute="CREATE DATABASE IF NOT EXISTS princesbrothers;"`.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to your MySQL username and password. The template uses `mysql://root:password@127.0.0.1:3306/princesbrothers`.
4. Apply the SQL migrations: `npm run db:migrate`.
5. Add the starter organic produce catalog: `npm run db:seed`.
6. Start the web app: `npm run dev`. The preflight checks the MySQL host and port configured in `DATABASE_URL`.

The app runs on `http://localhost:3000`. To use Google sign-in locally, add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI on the Google OAuth client configured by `GOOGLE_CLIENT_ID`, and set `GOOGLE_REDIRECT_URI` to that exact value. See [DEPLOYMENT.md](DEPLOYMENT.md) for production callback setup.

See [DEPLOYMENT.md](DEPLOYMENT.md) for production environment variables and release checks.

Authentication requires an `AUTH_JWT_SECRET` with at least 32 characters. Sessions, revocation state, OTPs, and OAuth state are stored in MySQL. Google OAuth and Africa's Talking SMS require valid provider credentials in `.env`. Tokens are issued as `httpOnly`, `Secure`, `SameSite=Strict` cookies. The middleware performs edge-safe JWT and portal checks; server handlers verify active sessions against MySQL.

The portal policies are encoded in `frontend/features/auth`: storefront sessions support password, Google OAuth, and guest checkout; contributors require email verification and approval; drivers use PIN sessions; admins require password plus TOTP.

The driver portal is available at `/driver`, with phone/PIN login at `/driver/login`. Its dashboard shows each driver's assigned deliveries and supports delivery status updates, route navigation, proof capture, and editing the driver's own vehicle details, service locations, and payout accounts. Server actions scope changes to the active driver's database record. Driver PIN hashes are stored on the `Driver` record; provision them through a trusted admin or seed flow before enabling production sign-in.

The admin dashboard is available at `/admin/dashboard`; sign in at `/login/admin`. The catalog editor reads and updates MySQL products, category assignments, image URLs, availability, and inventory. The remaining order, partner, RBAC, audit, and session panels are demonstration data until their write paths are connected.

The system `Accountant` admin role is available in Admin users. Create an admin account and assign that role to grant access to the private income/expense ledger and CSV reports. Each accountant account sees only the transactions it recorded; other admin roles cannot read those records. Apply `npm run db:migrate` to create the finance table and Accountant role in an existing database.

Privacy notices are available at `/privacy-policy` and `/terms-and-conditions`. The versioned policy API is `/api/v1/privacy/policy`; rights requests use `/api/v1/privacy/verification-code` followed by `/api/v1/privacy/rights-request`, and cookie choices are recorded at `/api/v1/privacy/consent-log`. Apply both the application schema and `db/privacy_tables.sql` through `npm run db:migrate`; the migration runner ensures the consent and rights-request tables for both new and existing databases. Rights-request email/SMS notifications require the corresponding existing provider configuration, and `AUTH_JWT_SECRET` is required to create and verify request codes.

The policy and terms are operational drafts, not legal certification. Before launch, have Rwanda privacy counsel and finance confirm lawful bases, cross-border transfer safeguards, statutory retention periods, provider arrangements, and the actual technical controls described on the pages.

Checkout payment context is resolved by `frontend/features/payments/payment-context.ts`. It checks Cloudflare (`cf-ipcountry`), AWS CloudFront (`cloudfront-viewer-country`), and generic country headers, then applies the `pb_currency` session cookie as a manual override. FX rates are cached in process for five minutes and can be supplied through `FX_RATES_JSON`. Gateway availability is regional, and each checkout transaction writes its base amount, converted amount, currency, FX rate, gateway, region, and timestamp to `AuditLog` metadata.

The storefront includes a header theme switch whose selection is stored only in the current browser tab session. The generated public sitemap is available at `/sitemap.xml`; set `APP_URL` to the canonical public origin for deployment.

See [PROJECT-DOCUMENTATION.txt](PROJECT-DOCUMENTATION.txt) or [PROJECT-DOCUMENTATION.pdf](PROJECT-DOCUMENTATION.pdf) for the project overview, route map, local setup, and operational notes.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Typechecking is required for the web, database, and shared UI workspaces. CI runs each workspace explicitly and fails on the first type error.
