# Go-live checklist

Everything the code cannot do for itself. Work top to bottom — the first
section blocks orders, the second blocks trust, the third is polish.

Two items have multi-day external lead times. **Start them today:** MSG91 DLT
registration and Razorpay KYC.

---

## 1. Accounts to create

| Service | Needed for | Lead time |
| --- | --- | --- |
| [Neon](https://console.neon.tech) | Database | Minutes |
| [Razorpay](https://dashboard.razorpay.com) | Payments | **Days — KYC** |
| [MSG91](https://control.msg91.com) + DLT | Login OTP | **Days — DLT approval** |
| [Cloudinary](https://console.cloudinary.com) | Product photography | Minutes |
| [Meta Business](https://business.facebook.com) | WhatsApp, Pixel, CAPI, catalogue | Hours–days |
| [Resend](https://resend.com) | Order receipt emails | Minutes + DNS |
| [Google Analytics](https://analytics.google.com) + [GTM](https://tagmanager.google.com) | Analytics | Minutes |
| [Vercel](https://vercel.com) | Hosting | Minutes |

Credential-by-credential instructions: [`SETUP.md`](SETUP.md).

---

## 2. Blocking — the store cannot take an order without these

- [ ] **Neon database.** Copy the pooled string to `DATABASE_URL` and the
      direct string to `DIRECT_DATABASE_URL`. They must differ. Run
      `npm run db:deploy`.
- [ ] **Generate secrets.** `SESSION_SECRET`, `OTP_PEPPER`, `CRON_SECRET` —
      commands in `SETUP.md`. Do not reuse the local ones.
- [ ] **`NEXT_PUBLIC_SITE_URL`** set to the real https origin, no trailing
      slash. Canonical URLs, the sitemap and the product feed all derive from
      it, and it is still localhost until you change it.
- [ ] **Razorpay live keys** in `NEXT_PUBLIC_RAZORPAY_KEY_ID` and
      `RAZORPAY_KEY_SECRET`.
- [ ] **Razorpay webhook** registered at
      `https://your-domain.com/api/webhooks/razorpay`, subscribed to
      `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`,
      with its secret in `RAZORPAY_WEBHOOK_SECRET`.
      **Without this, money is taken but orders stay PENDING forever.**
- [ ] **MSG91 + DLT.** Register, get an OTP template with `##OTP##` approved,
      then set `SMS_DRIVER="msg91"`. Until this is done nobody but you can log
      in, because the OTP only prints to the server log.
- [ ] **`ADMIN_BOOTSTRAP_MOBILES`** set to your own number, and only numbers
      that should be super admin.

---

## 3. Content you must write — nothing has been written for you

These are claims about your business. I deliberately left them blank rather
than inventing them; every surface hides the field until you fill it in.

### Admin → Settings

- [ ] **Contact:** email, phone, WhatsApp number, address, city, state, hours.
      Leave the address blank rather than approximate — it is published in
      schema.org data and surfaces in Google local results.
- [ ] **Shipping:** free-shipping threshold, flat rate, **dispatch promise**
      and **delivery estimate**. The last two are commitments customers will
      hold you to. Blank hides them.
- [ ] **Brand:** footer tagline.
- [ ] **Social links:** left blank on purpose — a guessed URL could point at
      someone else's account.
- [ ] **Announcement bar** text, if you want one.

### Admin → Pages

Seven pages, all currently empty and noindex. Each shows a checklist of what
it must cover.

- [ ] Our Story
- [ ] Contact
- [ ] Silver Care Guide
- [ ] **Privacy Policy** — have a lawyer review
- [ ] **Terms of Service** — have a lawyer review
- [ ] **Shipping Policy** — have a lawyer review; must match Settings
- [ ] **Returns & Exchanges** — have a lawyer review

> The four policy pages are legally operative documents. Do not publish
> generated or copied text you have not had reviewed.

### Admin → Homepage

- [ ] **"Our story" section** — currently placeholder text that says so.
- [ ] Hero images and headings, once you have photography.

### Seeded demo content to replace

- [ ] **All 24 products are invented.** Names, descriptions, prices, weights
      and dimensions are plausible fiction for demonstrating the storefront.
      Replace or delete every one before launch.
- [ ] **All 6 reviews are invented**, attributed to fake customers. Delete
      them — published fake reviews are illegal under the Consumer Protection
      Act 2019 and a Google policy violation.
- [ ] **FAQ answers prefixed `[SET THIS]`** state policy that is not yours
      yet. Fix or delete each. FAQs about what 925 means and how to clean
      silver are factual and can stay.
- [ ] **Product images are generated SVG placeholders.** Replace with real
      photography via Cloudinary.

---

## 4. Before you announce it

- [ ] Place a **real order end to end on live keys**, then refund it. This is
      the only test that proves the webhook, stock decrement, WhatsApp and
      receipt all work together.
- [ ] Confirm the order reached `CONFIRMED` in Admin → Orders.
- [ ] Confirm stock decremented, and the reservation released.
- [ ] Confirm the WhatsApp confirmation arrived.
- [ ] **Meta Events Manager → Test Events: confirm ONE Purchase showing both
      "Browser" and "Server".** Two separate conversions means the shared
      event id is not reaching both sides, and every sale will be
      double-counted — halving apparent ROAS.
- [ ] `META_CAPI_TEST_EVENT_CODE` cleared.
- [ ] `/sitemap.xml` and `/robots.txt` respond and reference the real domain.
- [ ] Vercel Cron shows `/api/cron/maintenance` running hourly. Without it,
      abandoned checkouts hold stock indefinitely.
- [ ] Submit the sitemap in Google Search Console.
- [ ] Point Meta Commerce Manager at `/api/feeds/meta-catalog` as a scheduled
      feed.

---

## 5. Watch in the first week

| Signal | Why it matters |
| --- | --- |
| `webhook_events` rows with `error` not null | Payments that arrived but failed to process — the most expensive bug class |
| `notifications` rows with `status = 'FAILED'` | Undelivered WhatsApp or receipts |
| Orders stuck `PENDING` over an hour | Webhook not arriving, or cron not running |
| Confirmed orders with `metaCapiSentAt` null | Purchase events not reaching Meta; ad optimisation is blind |

Queries are in [`DEPLOYMENT.md`](DEPLOYMENT.md#monitoring).

---

## 6. Known gaps, by design

Not bugs — V1 scope decisions, all architected for later:

- No courier tracking. Order statuses beyond Confirmed/Cancelled exist in the
  schema but nothing sets them.
- No refunds from the admin. Refund in the Razorpay dashboard; the webhook
  records it.
- No bulk product import. Products are added one at a time in the admin; a CSV
  importer would be the next thing to build if the catalogue is large.
- Media files cannot be deleted from the admin. A file may be referenced by a
  product, category, hero slide or campaign, and removing one out from under a
  live page is not recoverable from that screen — manage deletions in
  Cloudinary, which keeps its own history.
