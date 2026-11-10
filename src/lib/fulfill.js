import { stripe, platformFee } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Safe to call many times for the same session (webhook + success page).
export async function fulfillCheckout(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { ok: false, session };

  const { prompt_id, buyer_id, payout } = session.metadata || {};
  if (!prompt_id || !buyer_id) return { ok: false, session };

  const admin = createAdminClient();
  const { error } = await admin.from("purchases").upsert(
    {
      prompt_id,
      buyer_id,
      amount_cents: session.amount_total,
      seller_payout_cents: session.amount_total - platformFee(session.amount_total),
      payout_status: payout === "manual" ? "pending" : "auto",
      stripe_session_id: session.id,
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true }
  );

  if (error && error.code !== "23505") throw error;
  return { ok: true, session, promptId: prompt_id };
}
