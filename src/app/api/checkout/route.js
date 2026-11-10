import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, platformFee, siteUrl } from "@/lib/stripe";

export async function POST(request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const { promptId } = await request.json();
  const admin = createAdminClient();

  const { data: prompt } = await admin
    .from("prompts")
    .select("id, title, price_cents, seller_id, profiles(stripe_account_id, stripe_onboarded, manual_payout)")
    .eq("id", promptId)
    .single();

  if (!prompt) return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  if (prompt.seller_id === user.id) {
    return NextResponse.json({ error: "You can't buy your own prompt." }, { status: 400 });
  }

  const seller = prompt.profiles;
  const viaStripe = Boolean(seller?.stripe_account_id && seller.stripe_onboarded);
  if (!viaStripe && !seller?.manual_payout) {
    return NextResponse.json({ error: "This seller can't accept payments yet." }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("purchases")
    .select("id")
    .eq("prompt_id", prompt.id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ url: `${siteUrl()}/prompt/${prompt.id}` });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: prompt.price_cents,
          product_data: { name: prompt.title },
        },
      },
    ],
    // Manual-payout sellers: the platform keeps the money and pays them out later.
    payment_intent_data: viaStripe
      ? {
          application_fee_amount: platformFee(prompt.price_cents),
          transfer_data: { destination: seller.stripe_account_id },
        }
      : undefined,
    metadata: { prompt_id: prompt.id, buyer_id: user.id, payout: viaStripe ? "stripe" : "manual" },
    success_url: `${siteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/prompt/${prompt.id}`,
  });

  return NextResponse.json({ url: session.url });
}
