# Admin dashboard and storefront upgrade

## Phase 1 — Product delete and edit

- **Problem/root cause:** The admin catalog had an Edit button but no Delete button and no product-delete server action, so the failure could not produce an HTTP request, response, browser console error, or server stack trace. Consequently, no exact runtime error or stack trace was observed; none is fabricated here. Static inspection also found `ON DELETE RESTRICT` foreign keys from `OrderItem`, `InventoryItem`, and `CartItem` to `Product`, so hard deletion would fail for referenced records. `OrderItem` already stores `productName` and `unitPrice` snapshots.
- **Changes:** Added permission-checked soft deletion (`Product.deletedAt`, `isActive = 0`), confirmation and feedback in every catalog row, and filters to keep archived products out of admin/storefront listings. Checkout already rejects inactive products, so archived products cannot be purchased. The existing editor supports name, description, price, stock, category, and image editing; a successful save now also gives feedback and refreshes the server component. Changed files: `frontend/app/(admin)/actions.ts`, `frontend/features/admin/components/dashboard.tsx`, `frontend/features/admin/server/data.ts`, `frontend/features/storefront/server/data.ts`, `db/database_pb.sql`, `db/migrate.js`, `frontend/features/admin/archive-product.test.ts`.
- **Migration:** Run `npm run db:migrate`; existing databases receive the nullable `Product.deletedAt` column. New databases include it in `database_pb.sql`. No existing products are deleted or rewritten by this migration.
- **Environment:** No new environment variables.
- **Test:** `npm test -- --run frontend/features/admin/archive-product.test.ts` (or `npm test`); verify an admin with `catalog:write` can edit and archive a product, that the confirmation can be canceled, and that archived products are absent from storefront and checkout while old orders still show their saved item name and price.
- **Deployment/manual steps:** Apply the migration before deploying. The original missing-delete UI cannot be replayed against a live browser/database in this environment, so browser network/server-log capture remains unverified.
- **Verification:** Archive tests passed (3/3), `npm run typecheck` passed for web/db/ui, and `git diff --check` passed. `npm run lint --workspace=@princess-brothers/web` is blocked by existing `no-unused-vars` errors in SmoothUI components and the admin dashboard; no unrelated lint cleanup was made. Database migration and browser flows were not run because no isolated local database/browser session was available.

## Later phases

## Phase 2 — Admin table presentation and controls

- **Problem/root cause:** Existing catalog search was inert, and the admin-user, session, audit, and accountant tables lacked consistent sorting/pagination and had inconsistent table presentation. The order workflow is a kanban board, not a table; no standalone customer or driver table exists in the current admin dashboard.
- **Changes:** Added reusable search, sort, and pagination controls; wired them to the product, admin-user, session, audit, and accountant tables; added no-result states and a dashboard loading skeleton; and standardized sticky headers, hover/zebra rows, rounded containers, keyboard focus, and mobile horizontal scrolling. Changed files: `frontend/app/admin-tables.css`, `frontend/app/globals.css`, `frontend/app/(admin)/admin/dashboard/loading.tsx`, `frontend/features/admin/components/table-controls.tsx`, `frontend/features/admin/components/use-admin-table.ts`, `frontend/features/admin/components/dashboard.tsx`, `frontend/features/admin/components/accountant-dashboard.tsx`.
- **Migration:** None.
- **Environment:** None.
- **Test:** `npm run typecheck --workspace=@princess-brothers/web`; manually filter, sort each column, paginate more than 10 records, and inspect tables at desktop/mobile sizes.
- **Deployment/manual steps:** Deploy the web assets. No standalone customer/driver management table was added because those panels do not currently exist.
- **Verification:** Web typecheck passed; the Phase 1 archive tests still pass (3/3); `git diff --check` and targeted ESLint on new helpers/accountant table passed. Full workspace lint remains blocked by pre-existing `no-unused-vars` failures in SmoothUI and existing dashboard code. No browser viewport or console smoke test was possible in the available environment.

## Phase 3 — Demand-sorted storefront products

- **Problem/root cause:** The homepage placed featured products after the intro, mission, and category sections, while storefront product retrieval sorted alphabetically and did not use order activity.
- **Changes:** Moved featured products immediately below `.organic-section-3d`. Added a cached MySQL aggregate for qualifying order-item units in the last 30 days, counting the last 7 days twice, and stable server-side ordering by demand score then product creation time (newest first). Pending-payment, canceled, and refunded orders do not count as demand. Cache remains 30 seconds with the existing `catalog` tag. Changed files: `frontend/app/(storefront)/page.tsx`, `frontend/features/storefront/server/data.ts`, `frontend/features/storefront/server/demand.ts`, `frontend/features/storefront/server/demand.test.ts`.
- **Migration:** None.
- **Environment:** None.
- **Test:** `npm test -- --run frontend/features/storefront/server/demand.test.ts`; verify homepage order after seeded/real orders and verify ties with no demand are newest-first.
- **Deployment/manual steps:** Deploy web code. The demand aggregate uses existing order and order-item data; no scheduled task is required.
- **Verification:** Demand and archive tests passed (5/5), web typecheck passed, and `git diff --check` passed. No database or browser test was run.

Phases 4–10 have not been implemented yet.
