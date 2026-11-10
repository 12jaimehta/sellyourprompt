import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import SellForm from "@/components/SellForm";

export default async function SellPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/sell");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_onboarded")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Sell a prompt</h1>
      <p className="mt-2 text-neutral-600">
        Show buyers what your prompt creates. They pay, you get paid straight to your bank via Stripe.
      </p>

      {profile?.stripe_onboarded ? (
        <SellForm userId={user.id} feePercent={Number(process.env.PLATFORM_FEE_PERCENT ?? 10)} />
      ) : (
        <div className="card mt-8 p-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-xl">
            💳
          </div>
          <h2 className="text-lg font-semibold">First, connect Stripe to get paid</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-600">
            Takes about 2 minutes. This is where your earnings from every sale will be sent.
          </p>
          <form action="/api/connect/onboard" method="post" className="mt-6">
            <button className="btn">Connect Stripe</button>
          </form>
        </div>
      )}
    </div>
  );
}
