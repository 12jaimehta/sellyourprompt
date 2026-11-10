import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Safe to call many times for the same session (webhook + success page).
export async function fulfillCheckout(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { ok: false, session };

  const { prompt_id, buyer_id } = session.metadata || {};
  if (!prompt_id || !buyer_id) return { ok: false, session };

  const admin = createAdminClient();
  const { error } = await admin.from("purchases").upsert(
    {
      prompt_id,
      buyer_id,
      amount_cents: session.amount_total,
      stripe_session_id: session.id,
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true }
  );

  if (error && error.code !== "23505") throw error;
  return { ok: true, session, promptId: prompt_id };
}
