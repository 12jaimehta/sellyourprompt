# SellYourPrompt

A simple marketplace to buy and sell AI prompts. Every prompt shows what it created, and sales numbers come from real Stripe payments.

Built with Next.js (JavaScript), Supabase (database, auth, storage) and Stripe Connect (payments and seller payouts).

## How money flows

1. A seller connects a Stripe Express account (from **Dashboard** or **Sell**).
2. A buyer pays with Stripe Checkout.
3. Stripe sends the price minus the platform fee (`PLATFORM_FEE_PERCENT`, default 10%) to the seller. The platform keeps the fee and pays Stripe's processing fee out of it.

## Setup (about 10 minutes)

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste all of `supabase/schema.sql`, and run it.
3. In **Authentication → URL Configuration**, set the Site URL to your site (e.g. `http://localhost:3000`) and add `http://localhost:3000/auth/callback` to the redirect URLs.
4. Copy the URL, anon key and service role key from **Project Settings → API**.

### 2. Stripe
1. In the [Stripe Dashboard](https://dashboard.stripe.com), turn on **Connect** (Settings → Connect) and finish the platform profile.
2. Copy your secret key from **Developers → API keys**.
3. Webhooks:
   - Local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe --forward-connect-to localhost:3000/api/webhooks/stripe` and use the `whsec_...` it prints.
   - Production: add an endpoint at `https://YOUR_DOMAIN/api/webhooks/stripe` with `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and a **Connect** endpoint at the same URL with `account.updated`.

The success page and dashboard also sync with Stripe directly, so the app works even before webhooks are set up.

### 3. Run it
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Use the Stripe test card `4242 4242 4242 4242` with any future date and CVC.

## Deploy
Push to GitHub, import the repo on [Vercel](https://vercel.com), add the same environment variables (set `NEXT_PUBLIC_SITE_URL` to your real domain), and deploy.
