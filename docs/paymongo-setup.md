# Accepting payments on Atlas

Status of each subscription payment path and how to turn them on.

| Path | Methods | Status | To enable |
|------|---------|--------|-----------|
| **Manual QR** | GCash / Maya / bank QRPH / crypto | ✅ Live | Admin adds a QR at `/admin/payments` |
| **PayMongo** | GCash, GrabPay, Maya, card (PHP) | ⚙️ Code ready | Add the two env keys below |
| **Stripe** | International card (USD) | ❌ Needs setup | Create Stripe prices + set ids on each plan |

The **code** for all three is implemented. QR works today. PayMongo needs
only configuration (no code). Stripe additionally needs a Stripe price id on
each `subscriptionPlans` row.

---

## Enable PayMongo (recommended for PH payments)

### 1. Get your API secret key
PayMongo dashboard → **Developers → API Keys** → copy the **Secret key**.
Use `sk_test_…` while testing, `sk_live_…` for real money.

### 2. Register the webhook
PayMongo dashboard → **Developers → Webhooks → Add endpoint**:

- **URL:** `https://<your-domain>/api/paymongo/webhook`
- **Events:** `checkout_session.payment.paid` and `payment.failed`

Copy the webhook's **signing secret** (`whsk_…`).

> The webhook is what flips a user's plan to **active** after they pay. It is
> already on the public route allowlist (`middleware.ts`), so PayMongo can reach
> it without a login session. If you skip this step, people can pay but their
> plan never activates.

### 3. Set the environment variables
In **Vercel → Settings → Environment Variables** (and `.env.local` for local
testing) — see [`.env.example`](../.env.example):

```
PAYMONGO_SECRET_KEY=sk_live_...
PAYMONGO_WEBHOOK_SECRET=whsk_...
NEXT_PUBLIC_APP_URL=https://<your-domain>   # for the success/cancel redirects
```

### 4. Redeploy and test
Redeploy. In the app, open an upgrade prompt → choose **GCash / GrabPay (PH)**
→ pick a plan → you're sent to PayMongo checkout. Pay, and the webhook marks
the subscription active and bumps `currentPeriodEnd`.

**Test first:** use `sk_test_` keys and PayMongo test mode, complete one full
payment, confirm the plan activates, then switch to `sk_live_`.

### How it behaves
- PayMongo checkout is a **one-time charge per period** — it does **not**
  auto-renew. Access lasts one interval; the user pays again to continue
  (same model as manual QR). The Subscription Agreement states this.
- Relevant code: `app/api/paymongo/checkout/route.ts` (creates the session),
  `app/api/paymongo/webhook/route.ts` (activates the plan on payment).

---

## Enable Stripe (optional, international cards)

1. Create the products/prices in the Stripe dashboard (one monthly + one yearly
   price per plan).
2. Put each price id on its plan — edit the `subscriptionPlans` rows and set
   `stripePriceIdMonthly` / `stripePriceIdYearly` (e.g. from the Convex
   dashboard, or extend `convex/seed.ts:seedPlans`).
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`; register the Stripe
   webhook at `https://<your-domain>/api/stripe/webhook`.

Without step 2, Stripe checkout returns *"this plan has no Stripe price
configured."*

---

## Plans

Plan names/prices/features live in Convex (`subscriptionPlans`). The canonical
definitions are in `convex/seed.ts` → `seedPlans`; run `npx convex run
seed:seedPlans` to upsert the live rows to match it.
