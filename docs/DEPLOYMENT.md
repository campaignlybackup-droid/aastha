# Deployment

Target: Vercel + Neon. Nothing is Vercel-specific except `vercel.json`; any Node
host that can run `next start` works, provided you schedule the cron yourself.

---

## First deploy

1. **Push to GitHub.** Confirm `.env` is absent from the repo:
   ```bash
   git ls-files | grep -c '^\.env$'   # must print 0
   ```

2. **Create the Neon database** and note the pooled and direct connection
   strings ([`SETUP.md`](SETUP.md#1-database--neon)).

3. **Import the repo into Vercel.** Framework preset: Next.js. Build command and
   output directory are detected; `npm run build` already runs
   `prisma generate` first, which is required because the generated client is
   gitignored.

4. **Add environment variables** for Production and Preview. At minimum:
   `DATABASE_URL`, `DIRECT_DATABASE_URL`, `SESSION_SECRET`, `OTP_PEPPER`,
   `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, plus whichever integrations are ready.

   Give Preview its **own database branch**. Neon branching makes this cheap,
   and it stops preview deploys writing to production data.

5. **Apply migrations.** Deploys do not migrate automatically — that is
   deliberate, so a schema change is never applied by an unrelated deploy:
   ```bash
   DIRECT_DATABASE_URL="…" npm run db:deploy
   ```

6. **Register the Razorpay webhook** at
   `https://your-domain.com/api/webhooks/razorpay`
   ([`SETUP.md`](SETUP.md#4-payments--razorpay)).

7. **Verify the cron.** `vercel.json` schedules `/api/cron/maintenance` hourly.
   Check it in the Vercel dashboard under Cron Jobs after the first deploy.

8. **Smoke test on production:**
   - [ ] Homepage renders and images load from Cloudinary
   - [ ] A product page shows correct price and stock
   - [ ] OTP arrives by SMS and login works
   - [ ] A real order completes and reaches `CONFIRMED`
   - [ ] The order appears in `/admin/orders`
   - [ ] WhatsApp confirmation is received
   - [ ] Meta Events Manager shows ONE Purchase, browser + server
   - [ ] `/sitemap.xml` and `/robots.txt` respond

---

## Migrations

```bash
npm run db:migrate            # development: create + apply
npm run db:deploy             # production: apply only
npx prisma migrate status     # what is pending
```

Migrations run against `DIRECT_DATABASE_URL`. Applying them through a pooled
endpoint fails on advisory locks.

**Expand then contract** for destructive changes. Adding a nullable column and
backfilling is safe; dropping a column that running code still selects is not.
Deploy the code that stops using it, then drop it in a later migration.

---

## Caching

| Route | Behaviour |
| --- | --- |
| `/` | Static, `revalidate = 300`, busted on CMS save |
| `/product/[slug]` | Prerendered for the 50 best sellers, on-demand after |
| `/category`, `/collections`, `/search`, `/shop` | Dynamic (they read `searchParams`) |
| `/cart`, `/checkout`, `/account`, `/order`, `/admin` | Always dynamic, noindex |

The header bag count is fetched client-side from `/api/cart/count` **on
purpose**. Reading the cart cookie in the storefront layout would opt every
catalogue page into dynamic rendering; keeping that one per-visitor value on the
client is what allows the homepage and product pages to be served from the CDN.
If you ever move it back into the layout, expect the whole catalogue to go
dynamic.

Admin mutations call `revalidatePath`, so edits appear immediately rather than
after the revalidation window.

---

## Monitoring

Worth watching from day one:

- **`WebhookEvent` rows with a non-null `error`.** These are payments that
  arrived but failed to process — the most expensive class of bug in the system.
  ```sql
  select * from webhook_events where error is not null order by created_at desc;
  ```
- **`Notification` rows with `status = 'FAILED'`.** Undelivered WhatsApp or
  email. Visible per-order in the admin.
- **Orders stuck in `PENDING` beyond an hour.** Either the cron is not running
  or the webhook is not arriving.
- **`Order.metaCapiSentAt` null on confirmed orders.** Purchase events are not
  reaching Meta; ad optimisation is flying blind.

---

## Rollback

Vercel keeps previous deployments — promote one to roll back code instantly.

Rolling back code does **not** roll back the database. If a release included a
migration, either the previous code must still work against the new schema
(which expand-then-contract guarantees) or you restore from a Neon
point-in-time branch, which loses writes since that point. Prefer forward
fixes.

---

## Backups

Neon provides point-in-time restore; verify the retention on your plan. For an
independent copy, schedule:

```bash
pg_dump "$DIRECT_DATABASE_URL" -Fc -f aastha-$(date +%F).dump
```

Test a restore before you need one. An untested backup is a hypothesis.
