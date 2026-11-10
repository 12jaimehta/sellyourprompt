import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import SellForm from "@/components/SellForm";
import PayoutChoice from "@/components/PayoutChoice";

export default async function SellPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/sell");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_onboarded, manual_payout")
    .eq("id", user.id)
    .single();

  const canSell = profile?.stripe_onboarded || profile?.manual_payout;

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sell a prompt</h1>
      <p className="mt-2 text-neutral-600">
        Show buyers what your prompt creates. They pay, you get paid.
      </p>

      {canSell ? (
        <SellForm userId={user.id} feePercent={Number(process.env.PLATFORM_FEE_PERCENT ?? 10)} />
      ) : (
        <PayoutChoice userId={user.id} next="/sell" />
      )}
    </div>
  );
}
