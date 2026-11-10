import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import PayoutChoice from "@/components/PayoutChoice";

export default async function PayoutsPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/payouts");

  const { data: existing } = await supabase
    .from("payout_details")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Payout settings</h1>
      <p className="mt-2 text-neutral-600">Choose where your earnings go.</p>
      <PayoutChoice userId={user.id} existing={existing} next="/dashboard" />
    </div>
  );
}
