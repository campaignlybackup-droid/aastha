# Credential setup

Where every environment variable comes from, and what breaks without it.

Nothing here is required to run the store locally. Each integration degrades to
a console driver or a clear customer-facing message until it is configured, so
you can wire them up one at a time.

---

## 1. Database — Neon

1. Create a project at <https://console.neon.tech>.
2. Copy **both** connection strings from the dashboard:
   - the **pooled** one → `DATABASE_URL` (the app uses this)
   - the **direct** one → `DIRECT_DATABASE_URL` (migrations use this)

They must differ. Migrations take session-level advisory locks, which a
transaction pooler does not preserve — running them through the pooled endpoint
hangs or fails.

```bash
npm run db:deploy   # apply migrations
npm run db:seed     # optional: sample catalogue
```

**Backups.** Neon keeps point-in-time restore automatically; check the retention
window on your plan. For an independent copy:

```bash
pg_dump "$DIRECT_DATABASE_URL" -Fc -f aastha-$(date +%F).dump
```

---

## 2. Sessions and OTP

```bash
openssl rand -base64 48   # SESSION_SECRET  (min 32 chars)
openssl rand -base64 32   # OTP_PEPPER      (min 16 chars)
openssl rand -hex 32      # CRON_SECRET
```

- Rotating `SESSION_SECRET` signs everyone out. Safe, occasionally useful.
- Rotating `OTP_PEPPER` invalidates in-flight OTPs only. Harmless.
- `ADMIN_BOOTSTRAP_MOBILES` — comma-separated E.164 numbers without `+`
  (e.g. `919876543210`) that are granted `SUPER_ADMIN` on first sign-in. This
  is a bootstrap only; manage roles in the admin afterwards. Remove numbers
  from it once real admins exist.

---

## 3. SMS OTP — MSG91

Dashboard: <https://control.msg91.com>

1. Complete **DLT registration** (mandatory for transactional SMS to Indian
   numbers). Allow several days — it is the long pole in going live.
2. Create an OTP template containing the `##OTP##` variable and get it approved.
3. Collect:

| Variable | Where |
| --- | --- |
| `MSG91_AUTH_KEY` | Settings → API → Auth Key |
| `MSG91_OTP_TEMPLATE_ID` | The approved template's id |
| `MSG91_SENDER_ID` | Your 6-character DLT-approved sender id |

Then set `SMS_DRIVER="msg91"`.

Leave it as `"console"` until DLT clears — the OTP prints to the server log and
the whole login flow is testable.

> The app generates and hashes its own OTP and passes it to MSG91. Do not
> enable MSG91's own OTP generation, or the delivered code will not match the
> stored hash.

---

## 4. Payments — Razorpay

Dashboard: <https://dashboard.razorpay.com>

1. **API keys** — Settings → API Keys. Use `rzp_test_*` until you are ready.
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (public, safe in the browser)
   - `RAZORPAY_KEY_SECRET` (**server only** — never expose)
2. **Webhook** — Settings → Webhooks → Add New Webhook.
   - URL: `https://your-domain.com/api/webhooks/razorpay`
   - Secret: generate one, put it in `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.failed`, `order.paid`,
     `refund.processed`

The webhook is what confirms orders. Without it, payments succeed at the bank
but orders stay `PENDING` — configure it before taking real money.

Test locally by tunnelling (`ngrok http 3000`) and pointing the webhook at the
tunnel, or with the built-in simulator:

```bash
npx tsx scripts/simulate-webhook.ts payment.captured
```

---

## 5. Media — Cloudinary

Dashboard: <https://console.cloudinary.com>

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Dashboard header (public) |
| `CLOUDINARY_API_KEY` | Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Settings → API Keys (**server only**) |
| `CLOUDINARY_FOLDER` | Any prefix, e.g. `aastha` |

Until this is set the seeded catalogue uses the generated SVG placeholders in
`public/placeholders/`. Regenerate them with
`node scripts/generate-placeholders.mjs`.

`next.config.ts` restricts remote images to your Cloudinary cloud, so set the
cloud name before uploading anything.

---

## 6. WhatsApp — Meta Cloud API

Setup: <https://developers.facebook.com> → your app → WhatsApp → API Setup

| Variable | Where |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | System user token — use a permanent one, not the 24h test token |
| `WHATSAPP_PHONE_NUMBER_ID` | API Setup page |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business settings |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | Public number for the "Chat with us" buttons |

Then set `WHATSAPP_DRIVER="cloud"`.

**Templates must be pre-approved.** Outside a 24-hour customer-initiated window
WhatsApp only delivers approved templates. Create these in WhatsApp Manager to
match `src/lib/whatsapp/client.ts`:

| Template name | Variables |
| --- | --- |
| `order_placed` | `{{1}}` first name, `{{2}}` order number, `{{3}}` total, `{{4}}` order URL |
| `payment_received` | same shape |

The floating "Chat with us" button and the order-page WhatsApp link are plain
`wa.me` deep links and need no API access — only `NEXT_PUBLIC_SUPPORT_WHATSAPP`.

---

## 7. Email — Resend

1. Create an API key at <https://resend.com/api-keys> → `RESEND_API_KEY`.
2. Verify your sending domain (SPF + DKIM), then set `EMAIL_FROM`, e.g.
   `Aastha Silver & Jewels <orders@aasthasilver.in>`.
3. Set `EMAIL_DRIVER="resend"`.

Order receipts only send when the customer supplied an email; it is optional at
checkout by design, since WhatsApp is the primary channel.

---

## 8. Meta Pixel and Conversions API

Events Manager: <https://business.facebook.com/events_manager2>

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | Data source id (public) |
| `META_CAPI_ACCESS_TOKEN` | Settings → Conversions API → Generate access token (**server only**) |
| `META_CAPI_TEST_EVENT_CODE` | Test Events tab — **clear this in production** |

**Verify deduplication before spending on ads.** In Test Events you should see
one Purchase per order showing both "Browser" and "Server", not two separate
conversions. If you see two, the shared `event_id` is not reaching both sides
and every sale is being double-counted.

### Product catalogue

Commerce Manager can ingest the store directly. Products expose a stable id,
title, description, price, availability, product URL, image, brand and
category, and the Product JSON-LD on each product page is a valid feed source.
A dedicated feed endpoint is not yet built — see "Not yet built" in the
handover notes.

---

## 9. GA4 and Google Tag Manager

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_GTM_CONTAINER_ID` | `GTM-XXXXXXX` |

If **both** are set, GA4 is configured inside GTM and the direct gtag script is
deliberately not loaded — running both would double-count every pageview.

The app pushes `view_item`, `search`, `add_to_cart`, `begin_checkout`,
`add_payment_info` and `purchase` to `dataLayer` with GA4-shaped `ecommerce`
payloads. In GTM, create GA4 Event tags triggered on those custom events.

---

## Security checklist before going live

- [ ] `.env` is not committed (`git check-ignore .env` prints `.env`)
- [ ] `SESSION_SECRET` and `OTP_PEPPER` are freshly generated, not the examples
- [ ] `ADMIN_BOOTSTRAP_MOBILES` contains only numbers that should be super admin
- [ ] Razorpay **live** keys, and the webhook registered and verified
- [ ] `META_CAPI_TEST_EVENT_CODE` is empty
- [ ] `NEXT_PUBLIC_SITE_URL` is the real https origin, no trailing slash
- [ ] `CRON_SECRET` set and the hourly cron reachable
- [ ] A test order placed end to end on live keys, then refunded
