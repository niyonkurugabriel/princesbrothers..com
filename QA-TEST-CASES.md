# E-commerce Functional QA Test Cases

Manual regression suite for the storefront's account, catalog, cart, checkout, and order workflows. Run against a non-production environment with disposable accounts, seeded products, and payment-provider sandbox credentials. Never use real card numbers or production customer data.

## User account and login

### UA-001 — Register a new customer
- **Objective:** Verify a valid customer can create an account.
- **Preconditions:** A unique email and phone number are available; the registration page is reachable.
- **Steps:** 1. Open account registration. 2. Enter valid first and last names, a unique email, phone, and an eight-character-or-longer password. 3. Submit and follow any required verification step.
- **Expected:** The account is created once, required verification is recorded, and the customer sees a signed-in state or clear next step.
- **Edge / negative:** Submit with an already-registered email; registration is rejected without creating a duplicate and the message does not expose private account details.

### UA-002 — Reject invalid registration data
- **Objective:** Confirm registration validates required fields and password rules.
- **Preconditions:** Registration page is open.
- **Steps:** 1. Leave a required field empty. 2. Enter malformed email and phone values. 3. Try a password below the minimum. 4. Submit each invalid combination.
- **Expected:** Each invalid submission is blocked with a field-specific, accessible error and no account is created.
- **Edge / negative:** Enter HTML/script text or extremely long values; input is safely rejected or bounded, never executed, and the page remains usable.

### UA-003 — Sign in with valid credentials
- **Objective:** Verify password authentication and authenticated navigation.
- **Preconditions:** An active customer account with known credentials exists.
- **Steps:** 1. Open sign in. 2. Enter the registered email and correct password. 3. Submit. 4. Open the account area and refresh the page.
- **Expected:** The customer is signed in, reaches the intended destination, and the session remains valid after refresh.
- **Edge / negative:** Submit the correct password with whitespace or casing changes in the email; email normalization behaves consistently without changing password semantics.

### UA-004 — Reject invalid login attempts
- **Objective:** Verify incorrect credentials do not grant access.
- **Preconditions:** An active test account exists.
- **Steps:** 1. Submit a wrong password. 2. Submit an unknown email. 3. Attempt to open a protected account URL.
- **Expected:** No session is issued, access to protected data is denied, and error wording does not reveal whether the email exists.
- **Edge / negative:** Repeated attempts from one client are throttled or otherwise protected according to the deployed authentication policy.

### UA-005 — Complete social single sign-on
- **Objective:** Verify Google SSO creates or connects the expected customer session.
- **Preconditions:** Google OAuth is configured for the QA environment; the test identity is permitted.
- **Steps:** 1. Choose Google sign-in. 2. Complete consent and authentication at the provider. 3. Return to the store. 4. Refresh and visit the account page.
- **Expected:** The OAuth state is validated, the customer is returned to the intended safe destination, and the authenticated session is active.
- **Edge / negative:** Cancel provider consent or deny access; no partial session is created and the user receives a clear recoverable outcome.

### UA-006 — Reject invalid or replayed SSO state
- **Objective:** Confirm OAuth callback state prevents request forgery and replay.
- **Preconditions:** Google OAuth is configured; a callback URL can be edited in the QA environment.
- **Steps:** 1. Start SSO. 2. Alter the callback state or reuse a consumed callback. 3. Submit the callback.
- **Expected:** The callback is rejected and no account is signed in or linked.
- **Edge / negative:** Provide an external `returnTo` URL; navigation remains on an allowed local route.

### UA-007 — Reset password with a valid link
- **Objective:** Verify a password reset updates credentials and consumes the token.
- **Preconditions:** Active account has a registered email; outbound reset email is configured.
- **Steps:** 1. Request a reset. 2. Open the received link before expiry. 3. Enter a compliant new password and confirm it. 4. Sign in with the new password. 5. Reopen the same link.
- **Expected:** Password is updated, the token is single-use, active storefront sessions are revoked, and the old password no longer works.
- **Edge / negative:** Submit mismatched passwords or a password outside the allowed length; no reset occurs and the token is not incorrectly consumed.

### UA-008 — Enforce password-recovery hourly limits
- **Objective:** Verify email recovery and reset endpoints limit abuse.
- **Preconditions:** QA database rate-limit records can be cleared or a fresh email/IP can be used.
- **Steps:** 1. Submit three forgot-password requests for one email and client IP within an hour. 2. Submit a fourth. 3. Repeat the check for reset attempts using one IP/token scope.
- **Expected:** The first three requests are allowed; subsequent requests receive HTTP 429 with a positive `Retry-After`, and requests resume after the window.
- **Edge / negative:** Use several email aliases from the same IP; the IP scope still prevents bypassing the per-email limit.

### UA-009 — Update account profile
- **Objective:** Verify permitted profile fields persist.
- **Preconditions:** Customer is signed in and can edit a test profile.
- **Steps:** 1. Change the display name and permitted contact fields. 2. Save. 3. Reload the profile and sign in again.
- **Expected:** Valid changes persist and are reflected consistently in the account.
- **Edge / negative:** Simulate a lost connection during save; the UI reports failure and does not falsely display unsaved data as persisted.

### UA-010 — Reject invalid or unauthorized profile updates
- **Objective:** Ensure profile changes are validated and scoped to the signed-in user.
- **Preconditions:** Two test customer accounts exist.
- **Steps:** 1. Submit malformed/oversized profile values. 2. While signed in as account A, attempt to change account B's identifier or profile. 3. Sign out and retry.
- **Expected:** Invalid values are rejected; account A cannot modify B; signed-out updates require authentication.
- **Edge / negative:** Submit markup in a name or address field; it is stored/encoded safely and never rendered as executable content.

## Product search and catalog

### SC-001 — Find products by exact search
- **Objective:** Verify search returns accurate matching products.
- **Preconditions:** Catalog contains active products with distinct names and descriptions.
- **Steps:** 1. Search for a known exact product name. 2. Search for a unique term from its description. 3. Open a result.
- **Expected:** Relevant active products are returned, irrelevant products are excluded, and each result links to the correct product detail.
- **Edge / negative:** Search for punctuation, quotes, SQL-like text, and an empty query; no error or query execution occurs and empty/no-result states are clear.

### SC-002 — Search autocorrect and no-result behavior
- **Objective:** Verify likely misspellings are handled helpfully without hiding exact results.
- **Preconditions:** A known product and supported search/autocorrect behavior are available.
- **Steps:** 1. Search the correct name. 2. Search a one-character misspelling. 3. Review any suggested corrected query and its results.
- **Expected:** A relevant correction or suggestion is shown and can be selected; exact terms remain searchable.
- **Edge / negative:** Search an ambiguous or unrelated misspelling; do not silently replace the query with an unrelated product.

### SC-003 — Apply catalog filters and sorting
- **Objective:** Verify price, size, color, availability filters and price sorting.
- **Preconditions:** Catalog includes products with known prices, size/color attributes, and both in-stock and unavailable states.
- **Steps:** 1. Apply a minimum and maximum price. 2. Sort low-to-high and high-to-low. 3. Select size, color, and in-stock filters one at a time. 4. Combine compatible filters.
- **Expected:** Every result satisfies all selected filters; price order is correct; displayed filter state matches the URL/UI.
- **Edge / negative:** Set a minimum above the maximum or choose a combination with no matches; show a useful empty state and allow clearing filters.

### SC-004 — Keep filters correct across navigation
- **Objective:** Verify filters do not produce stale or contradictory catalog results.
- **Preconditions:** Catalog contains enough items for at least two result pages.
- **Steps:** 1. Apply availability and price filters. 2. Navigate pages and sort order. 3. Use browser back/forward. 4. Clear all filters.
- **Expected:** Counts, pagination, sort order, and visible products remain consistent with current filters.
- **Edge / negative:** A product becomes unavailable between listing and reload; it is not presented as purchasable based on stale stock.

### SC-005 — Load product details and images
- **Objective:** Verify product detail content, images, price, and add-to-cart controls.
- **Preconditions:** An active product has a primary image and at least one valid product image.
- **Steps:** 1. Open the product detail page from search and from the catalog. 2. Inspect images, name, price, description, and options. 3. Select each available image/variant.
- **Expected:** Correct product details and images load; selected variant and price are clear; controls are keyboard accessible.
- **Edge / negative:** Make an image URL unavailable; a fallback appears and the rest of the product page remains functional.

### SC-006 — Display and enforce stock status
- **Objective:** Verify stock status on the product page matches purchasability.
- **Preconditions:** One in-stock, one low-stock, and one out-of-stock test product are available.
- **Steps:** 1. Open each product. 2. Compare stock message, quantity controls, and add-to-cart button. 3. Attempt to add each item.
- **Expected:** In-stock items can be added within stock; low-stock status is accurate; unavailable products cannot be purchased.
- **Edge / negative:** Inventory reaches zero after the page loads; add/checkout revalidates stock and reports the unavailable item.

## Shopping cart mechanics

### CT-001 — Add, update, and remove cart items
- **Objective:** Verify cart line and quantity operations.
- **Preconditions:** At least two purchasable products exist.
- **Steps:** 1. Add product A. 2. Add product B. 3. Increase and decrease A's quantity. 4. Remove B. 5. Reopen the cart.
- **Expected:** Each operation updates the correct line, item count, and displayed amount; removed products are absent.
- **Edge / negative:** Enter zero, negative, fractional, or extremely large quantity; the UI rejects/clamps invalid input and never exceeds available stock.

### CT-002 — Recalculate totals, tax, and shipping
- **Objective:** Verify totals update when cart contents and destination change.
- **Preconditions:** Tax and shipping rules plus at least two products are configured in QA.
- **Steps:** 1. Add items and note line totals/subtotal. 2. Enter a valid delivery location. 3. Change quantity and destination. 4. Compare tax, shipping, and final total with approved QA calculations.
- **Expected:** All amounts recompute from current cart and destination, use consistent rounding/currency, and the final total matches checkout.
- **Edge / negative:** Enter an unsupported postal code or interrupt the quote request; clearly identify unavailable estimates and do not retain a stale total as current.

### CT-003 — Preserve cart during refresh and session changes
- **Objective:** Verify expected cart persistence for guests and signed-in users.
- **Preconditions:** Browser storage is enabled; a guest cart and customer account are available.
- **Steps:** 1. Add items as a guest. 2. Refresh and reopen the browser tab. 3. Sign in. 4. Sign out and inspect the cart.
- **Expected:** Cart persistence/merge behavior matches the product specification; quantities are not silently duplicated or lost.
- **Edge / negative:** Corrupt or block local storage; the store recovers safely and explains that the cart could not be restored if necessary.

### CT-004 — Handle stock changes in cart
- **Objective:** Prevent checkout of a quantity no longer available.
- **Preconditions:** A product has limited stock and can be changed by a second QA session.
- **Steps:** 1. Add the limited-stock quantity in session A. 2. Reduce available stock in session B. 3. Refresh and proceed to checkout in session A.
- **Expected:** Current inventory is revalidated and the customer is asked to adjust the line before placing the order.
- **Edge / negative:** Inventory service/database is unavailable; checkout fails safely rather than confirming an unreserved order.

## Checkout and payments

### CO-001 — Pay successfully by card
- **Objective:** Verify successful credit/debit-card checkout.
- **Preconditions:** A valid cart and billing/shipping addresses exist; card gateway sandbox is enabled.
- **Steps:** 1. Proceed to checkout. 2. Select card. 3. Enter the provider's sandbox success card and valid billing data. 4. Confirm payment once.
- **Expected:** Payment is authorized once, the order is created once, totals/currency are correct, and the customer reaches confirmation.
- **Edge / negative:** Double-click Pay or refresh during the provider redirect; idempotency prevents duplicate charges/orders.

### CO-002 — Pay using Apple Pay
- **Objective:** Verify Apple Pay checkout where supported.
- **Preconditions:** Supported Apple device/browser, HTTPS QA host, Apple Pay sandbox merchant configuration, and eligible test wallet are available.
- **Steps:** 1. Add an item and proceed to checkout. 2. Select Apple Pay. 3. Authenticate in the sandbox wallet. 4. Return to the confirmation page.
- **Expected:** Wallet approval creates one paid order with the correct amount and payment method.
- **Edge / negative:** Cancel wallet authorization or test from an unsupported browser; no order is marked paid and a useful alternative is offered.

### CO-003 — Pay using PayPal
- **Objective:** Verify PayPal authorization, capture, and return flow.
- **Preconditions:** PayPal sandbox merchant and buyer accounts are configured.
- **Steps:** 1. Select PayPal at checkout. 2. Approve the sandbox payment. 3. Return to the store and inspect the order and payment record.
- **Expected:** The order is tied to one successful PayPal transaction and the amount/currency match checkout.
- **Edge / negative:** Cancel or deny payment at PayPal; no paid order is recorded and the cart can be retried.

### CO-004 — Handle expired card and payment decline
- **Objective:** Verify card failures are communicated without creating a paid order.
- **Preconditions:** Card gateway sandbox supports expired/declined test cards.
- **Steps:** 1. Attempt payment with an expired test card. 2. Retry with a declined test card. 3. Inspect order and payment state.
- **Expected:** Payment is declined with actionable messaging; no false success screen, duplicate capture, or paid status appears.
- **Edge / negative:** Gateway times out after submission; status is reconciled before allowing an unsafe retry.

### CO-005 — Validate billing address
- **Objective:** Verify billing-address mismatch handling.
- **Preconditions:** Card sandbox supports address verification; a checkout cart is ready.
- **Steps:** 1. Enter a valid card with a deliberately mismatched billing address. 2. Submit payment. 3. Correct the address and retry if allowed.
- **Expected:** Gateway decision is respected, the mismatch is clearly explained, and no unauthorized order is marked paid.
- **Edge / negative:** Address service is unavailable; checkout reports verification could not complete rather than treating the address as verified.

### CO-006 — Apply coupon and promotional discount
- **Objective:** Verify coupon eligibility and discount arithmetic.
- **Preconditions:** Active, expired, minimum-spend, and product-restricted QA coupons exist.
- **Steps:** 1. Apply a valid coupon to an eligible cart. 2. Check the discount and final total. 3. Remove and reapply. 4. Try an expired and an ineligible coupon.
- **Expected:** Eligible discount is applied once and totals are recalculated; invalid codes receive a clear reason without altering the total.
- **Edge / negative:** Alter the submitted discount amount in browser tools; the server recalculates eligibility and never trusts client totals.

### CO-007 — Redeem gift card
- **Objective:** Verify gift-card balance application and remainder due.
- **Preconditions:** A valid partially funded card, fully funded card, and invalid/expired QA gift card exist.
- **Steps:** 1. Apply each valid card to an order. 2. Check remaining payment due and the gift-card balance afterward. 3. Try an invalid or expired card.
- **Expected:** Balance is debited exactly once; partial balance is applied to the total; a fully covered order does not charge another method.
- **Edge / negative:** Two concurrent checkouts use the same balance; only available value is redeemed and no negative balance is created.

## Post-purchase and order flows

### PO-001 — Show confirmation and send order email
- **Objective:** Verify successful order confirmation and notification.
- **Preconditions:** Sandbox payment succeeds; customer email delivery is available.
- **Steps:** 1. Place a valid order. 2. Review confirmation number, products, amounts, delivery details, and status. 3. Check the customer's inbox.
- **Expected:** Confirmation matches the persisted order and one confirmation email is sent to the intended address.
- **Edge / negative:** Email provider fails after order commit; order remains accurately recorded and retrying notification does not create another order.

### PO-002 — Transfer order to inventory system
- **Objective:** Verify paid orders decrement/reserve the correct inventory.
- **Preconditions:** QA inventory integration is enabled and the chosen product has a known quantity.
- **Steps:** 1. Record stock. 2. Place an order for a known quantity. 3. Inspect inventory event/ledger and resulting stock. 4. Reprocess the same event if the integration supports replay.
- **Expected:** Correct SKU and quantity are transferred once; order and inventory references can be reconciled.
- **Edge / negative:** Inventory service is offline or returns an error; the order is not silently presented as fully fulfilled and retry/reconciliation is observable.

### PO-003 — Track an order through delivery
- **Objective:** Verify customer tracking reflects operational status.
- **Preconditions:** A test order exists and its status can be advanced by an authorized operator/driver.
- **Steps:** 1. Open tracking using the customer account/order link. 2. Advance through accepted, processing, dispatch, and delivery states. 3. Refresh after each transition.
- **Expected:** Only valid status transitions appear, timestamps/details are current, and tracking is scoped to the correct order/customer.
- **Edge / negative:** Use another customer's order number or an invalid reference; private tracking details are not disclosed.

### PO-004 — Cancel an eligible order
- **Objective:** Verify cancellation rules, stock restoration, and refund handling.
- **Preconditions:** One unpaid/eligible order and one order past the cancellation cutoff are available.
- **Steps:** 1. Request cancellation of the eligible order. 2. Confirm the action. 3. Inspect order state, inventory, and refund status. 4. Try cancelling the ineligible order.
- **Expected:** Eligible cancellation is recorded once, downstream stock/payment actions are accurate, and ineligible cancellation is denied with instructions.
- **Edge / negative:** Lose connection after confirming cancellation; retry does not create duplicate refunds or inventory restoration.

### PO-005 — Request a return or refund
- **Objective:** Verify return eligibility and refund workflow.
- **Preconditions:** A delivered return-eligible order and an expired return-window order exist in QA.
- **Steps:** 1. Submit a return request with reason and item. 2. Review request status and confirmation. 3. Attempt the same for the out-of-window order.
- **Expected:** Eligible request is recorded with a reference and next steps; refund is not shown as complete before approval/processing.
- **Edge / negative:** Submit a return for an item not in the order or repeat the request; invalid/duplicate requests are rejected or idempotently handled.
