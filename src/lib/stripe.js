import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_missing");

export function platformFee(priceCents) {
  const percent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
  return Math.round((priceCents * percent) / 100);
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function isAccountReady(account) {
  return Boolean(account?.details_submitted && account?.capabilities?.transfers === "active");
}
