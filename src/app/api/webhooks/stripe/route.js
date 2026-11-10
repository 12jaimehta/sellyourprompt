import { NextResponse } from "next/server";
import { stripe, isAccountReady } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/fulfill";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckout(event.data.object.id);
      break;
    case "account.updated": {
      const account = event.data.object;
      await createAdminClient()
        .from("profiles")
        .update({ stripe_onboarded: isAccountReady(account) })
        .eq("stripe_account_id", account.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
