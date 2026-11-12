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

Phases 2–10 have not been implemented yet.
