import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, siteUrl } from "@/lib/stripe";

// Creates (or reuses) the seller's Stripe Express account and sends them to onboarding.
async function handler() {
  const { user } = await getUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/login?next=/dashboard`, 303);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  let accountId = profile?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      email: user.email,
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        stripe_dashboard: { type: "express" },
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { user_id: user.id },
    });
    accountId = account.id;
    await admin.from("profiles").update({ stripe_account_id: accountId }).eq("id", user.id);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/api/connect/onboard`,
    return_url: `${siteUrl()}/dashboard?connected=1`,
  });

  return NextResponse.redirect(link.url, 303);
}

export const GET = handler;
export const POST = handler;
