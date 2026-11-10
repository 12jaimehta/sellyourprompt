import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, isAccountReady } from "@/lib/stripe";
import { money } from "@/lib/format";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login?next=/dashboard");

  let { data: profile } = await supabase
    .from("profiles")
    .select("username, stripe_account_id, stripe_onboarded")
    .eq("id", user.id)
    .single();

  // Sync Stripe status here too, so it works even before webhooks are set up.
  if (profile?.stripe_account_id && !profile.stripe_onboarded) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id).catch(() => null);
    if (isAccountReady(account)) {
      await createAdminClient()
        .from("profiles")
        .update({ stripe_onboarded: true })
        .eq("id", user.id);
      profile = { ...profile, stripe_onboarded: true };
    }
  }

  const [{ data: myPrompts }, { data: purchases }] = await Promise.all([
    supabase
      .from("prompts")
      .select("id, title, price_cents, sales_count, revenue_cents, preview_image_url")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select("id, created_at, prompts(id, title, model, prompt_secrets(content))")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
  const totalSales = (myPrompts || []).reduce((s, p) => s + p.sales_count, 0);
  const totalRevenue = (myPrompts || []).reduce((s, p) => s + p.revenue_cents, 0);
  const yourEarnings = Math.round((totalRevenue * (100 - feePercent)) / 100);

  return (
    <div className="space-y-12 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-neutral-500">Hey @{profile?.username}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your dashboard</h1>
        </div>
        {profile?.stripe_onboarded ? (
          <form action="/api/connect/dashboard" method="post">
            <button className="btn-light">View payouts on Stripe ↗</button>
          </form>
        ) : (
          <form action="/api/connect/onboard" method="post">
            <button className="btn">
              {profile?.stripe_account_id ? "Finish Stripe setup" : "Connect Stripe to sell"}
            </button>
          </form>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Prompts listed", myPrompts?.length || 0],
          ["Total sales", totalSales],
          ["You earned", money(yourEarnings)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Prompts you're selling</h2>
          <Link href="/sell" className="text-sm font-medium hover:underline">+ New prompt</Link>
        </div>
        {myPrompts?.length ? (
          <div className="card divide-y divide-neutral-100">
            {myPrompts.map((p) => (
              <Link key={p.id} href={`/prompt/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-neutral-50">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {p.preview_image_url && <img src={p.preview_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-sm text-neutral-500">{money(p.price_cents)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{money(p.revenue_cents)}</p>
                  <p className="text-neutral-500">{p.sales_count} sales</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-neutral-500">
            You haven't listed anything yet.{" "}
            <Link href="/sell" className="font-medium text-neutral-900 underline">Sell your first prompt</Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Prompts you bought</h2>
        {purchases?.length ? (
          <div className="grid gap-4">
            {purchases.map((b) => (
              <div key={b.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <Link href={`/prompt/${b.prompts?.id}`} className="font-medium hover:underline">
                    {b.prompts?.title}
                  </Link>
                  {b.prompts?.prompt_secrets?.content && <CopyButton text={b.prompts.prompt_secrets.content} />}
                </div>
                <pre className="line-clamp-4 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 font-sans text-sm text-neutral-700">
                  {b.prompts?.prompt_secrets?.content}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-neutral-500">
            Nothing yet. <Link href="/" className="font-medium text-neutral-900 underline">Browse prompts</Link>
          </div>
        )}
      </section>
    </div>
  );
}
