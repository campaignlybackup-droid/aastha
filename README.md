# Aastha Silver & Jewels

Custom e-commerce platform for a premium silver jewellery brand. Next.js 16
(App Router), TypeScript, Prisma 7 + PostgreSQL, Razorpay.

No Shopify, WooCommerce or hosted commerce engine — the storefront, cart,
checkout, order engine and CMS are all first-party code in this repository.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values marked below
npx prisma dev --name aastha   # local Postgres, prints a connection string
npm run db:migrate
npm run db:seed
npm run dev
```

The store runs at http://localhost:3000. Sign in at `/login` with the number in
`ADMIN_BOOTSTRAP_MOBILES`; with `SMS_DRIVER="console"` the OTP is printed in the
dev server terminal rather than texted.

### Minimum to boot

Only three variables are required to start:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | ≥32 chars — `openssl rand -base64 48` |
| `OTP_PEPPER` | ≥16 chars — `openssl rand -base64 32` |

Everything else degrades gracefully: without Razorpay keys the checkout records
the order and tells the customer payment is not enabled yet; without WhatsApp,
email or Meta credentials those messages are logged to the console instead of
sent. See [`docs/SETUP.md`](docs/SETUP.md) for how to obtain each credential.

---

## Architecture

```
src/
  app/
    (storefront)/     Customer-facing routes. Shares the storefront shell.
    admin/            Staff area. Own layout, no campaign theming, noindex.
    api/              Webhooks, cron, small JSON endpoints.
  components/
    ui/               Design-system primitives (Button, Field, Price…).
    storefront/       Customer components.
    admin/            Staff components.
    sections/         Homepage section renderers.
  lib/
    auth/  cms/  email/  meta/  payments/  seo/  sms/  whatsapp/  analytics/
    db.ts  env.ts  money.ts  ratelimit.ts  utils.ts
  server/             Server-only data access and business logic.
    actions/          Server actions (the write path).
prisma/
  schema.prisma       28 models.
  seed.ts             Realistic catalogue, homepage and a scheduled campaign.
scripts/              Dev utilities (placeholder art, webhook simulator…).
```

### Rules the codebase holds to

**No invented business facts.** Dispatch times, addresses, opening hours and
the brand story are settings, seeded blank. Every surface hides the field when
it is empty, so an unfilled setting shows nothing rather than a promise the
store never made. Do not hard-code any of them back in.

**Money is integer paise, everywhere.** Never a float rupee. `src/lib/money.ts`
is the only place that converts. Razorpay is also denominated in paise, so the
number we compute is the number we charge.

**Prices are computed server-side, on every read.** The cart stores only
`(variant, quantity)`. Totals, discounts, shipping and GST are recalculated
from current database state in `src/server/cart.ts`, and checkout charges the
output of that same function. The browser never supplies an amount.

**GST is inclusive.** Displayed prices already contain 3% GST, per Indian
jewellery retail convention. `taxPaise` is the component inside the total, not
an amount added at checkout.

**Orders snapshot what was bought.** `OrderItem` copies name, SKU, variant and
price at purchase time, so editing a product never rewrites a past receipt.

**The webhook is the authority on payment**, not the browser callback. See
"Payment flow" below.

**Server actions re-check authorisation.** A server action is a public HTTP
endpoint; the fact that the button was hidden proves nothing about the caller.

---

## Payment flow

```
customer → /checkout
  ↓ startCheckout()          re-prices cart, creates PENDING order,
                             reserves stock, creates a Razorpay order
  ↓ Razorpay Checkout (browser)
  ↓
  ├── browser handler   → verifyCheckoutPayment()  signature-checked;
  │                        exists only to move the customer along promptly
  └── Razorpay webhook  → /api/webhooks/razorpay   AUTHORITATIVE
                           ↓ verify signature over the raw body
                           ↓ claim event id (unique constraint = idempotency)
                           ↓ confirmOrder(): commit stock, redeem coupon,
                             mark PAID/CONFIRMED
                           ↓ onOrderConfirmed(): WhatsApp, email, Meta CAPI
```

Safeguards:

- **Overselling** — reservation is a conditional `UPDATE` whose `WHERE` requires
  the stock to still be present. A race for the last piece fails one order.
- **Duplicate webhooks** — the event id is claimed before any work happens, so a
  retry is a no-op. Verified: replaying a delivery leaves stock and the ledger
  unchanged.
- **Amount tampering** — a captured amount that does not equal the stored order
  total is recorded with an internal note and NOT confirmed.
- **Abandoned checkouts** — `releaseStaleReservations()` frees stock held by
  orders unpaid after 30 minutes. Wire it to the hourly cron.

### Testing payment without a Razorpay account

```bash
npx tsx scripts/simulate-webhook.ts payment.captured
npx tsx scripts/simulate-webhook.ts payment.captured --replay   # idempotency
npx tsx scripts/simulate-webhook.ts payment.failed
npx tsx scripts/inspect-order.ts                                # inspect result
```

Requires `RAZORPAY_WEBHOOK_SECRET` to be set to any value locally.

---

## Homepage and campaigns

The homepage has no hard-coded structure. It is a list of `HomepageSection`
rows, each with a type, a position and a JSON `settings` blob validated against
a per-type Zod schema in `src/lib/cms/sections.ts`. That one module is the
contract shared by the admin editor, the write path and the renderer.

**Campaigns take over by date, not by a switch.** A campaign is live when its
window contains the current instant and its status is `SCHEDULED` or `ACTIVE`.
When the window closes the resolver stops selecting it and the default homepage
returns on the next request. There is no cron job and no manual step. Overlaps
resolve by `priority`.

Section content is edited through generated forms (`src/lib/cms/fields.ts`)
rather than hand-written per type: a field spec declares label, kind and help
text, and the editor renders it. Zod still validates on save, so a spec that
drifts from its schema fails loudly instead of writing bad settings.

Adding a section type takes three edits: the enum in `schema.prisma`, a schema
in `sections.ts`, and a case in `components/sections/render.tsx`. The renderer's
`switch` is exhaustiveness-checked, so a missing case is a compile error rather
than a silently blank homepage.

---

## Tracking

Events are dispatched from one module (`src/lib/analytics/events.ts`); no
component contains a tracking snippet. Tags mount once in the root layout and
render only when their id is configured.

**Purchase deduplication matters most.** The order's `metaEventId` is sent as
`eventID` by the browser Pixel and as `event_id` by the server-side Conversions
API. Meta collapses the pair into one conversion. Without it every sale is
counted twice and ROAS reads as half its real value. `Order.metaCapiSentAt`
guards the server side against webhook replays.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run db:local` | Local Postgres via `prisma dev` |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Seed the catalogue (idempotent) |
| `npm run db:studio` | Prisma Studio |

---

## Local development notes

`npx prisma dev` is convenient but is not production Postgres. Two limits are
worth knowing, because both produce confusing errors:

- It accepts **exactly 10 simultaneous connections** and resets the 11th. The
  app pool is capped at 4 in development and 1 during `next build` to leave
  room for `db:seed` and `db:studio`. Exceeding it surfaces as
  `P1017 Server has closed the connection`.
- Heavy hot-reload churn can corrupt a pooled connection
  (`08P01 bind message supplies N parameters…`). Restarting the dev server
  clears it. Neither behaviour has been observed against Neon.

Point `DATABASE_URL` at Neon as soon as you have it; nothing in the code
changes.

---

## Going live

**[`docs/GO-LIVE.md`](docs/GO-LIVE.md) is the checklist** — accounts to create,
content you must write, and what to verify before announcing. Two items have
multi-day lead times (MSG91 DLT registration, Razorpay KYC); start those first.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). In short: Vercel + Neon, set the
environment variables, run `npm run db:deploy`, register the Razorpay webhook at
`{SITE_URL}/api/webhooks/razorpay`, and configure the two cron entries in
`vercel.json`.
