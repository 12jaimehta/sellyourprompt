import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { stripe, siteUrl } from "@/lib/stripe";

// Opens the seller's Stripe Express dashboard (payouts, balance).
export async function POST() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.redirect(`${siteUrl()}/login`, 303);

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_account_id) {
    return NextResponse.redirect(`${siteUrl()}/api/connect/onboard`, 303);
  }

  const link = await stripe.accounts.createLoginLink(profile.stripe_account_id);
  return NextResponse.redirect(link.url, 303);
}
