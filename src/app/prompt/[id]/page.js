import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import BuyButton from "@/components/BuyButton";
import CopyButton from "@/components/CopyButton";
import { money } from "@/lib/format";

export default async function PromptPage({ params }) {
  const { id } = await params;
  const { supabase, user } = await getUser();

  const { data: prompt } = await supabase
    .from("prompts")
    .select("*, profiles(username, stripe_onboarded, manual_payout)")
    .eq("id", id)
    .maybeSingle();

  if (!prompt) notFound();

  // RLS only returns the prompt text to the seller and to buyers.
  const { data: secret } = user
    ? await supabase.from("prompt_secrets").select("content").eq("prompt_id", id).maybeSingle()
    : { data: null };

  const isOwner = user?.id === prompt.seller_id;
  const canBuy = prompt.profiles?.stripe_onboarded || prompt.profiles?.manual_payout;

  return (
    <div className="grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to all prompts
        </Link>

        <div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-white">{prompt.model}</span>
            <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1">{prompt.category}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{prompt.title}</h1>
          <p className="mt-3 whitespace-pre-line text-neutral-600">{prompt.description}</p>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-neutral-100 px-5 py-3 text-sm font-medium">
            What this prompt created
          </div>
          {prompt.preview_image_url && (
            <img src={prompt.preview_image_url} alt="Result" className="w-full border-b border-neutral-100" />
          )}
          {prompt.preview_output && (
            <p className="whitespace-pre-line p-5 text-sm leading-relaxed text-neutral-700">
              {prompt.preview_output}
            </p>
          )}
          {!prompt.preview_image_url && !prompt.preview_output && (
            <p className="p-5 text-sm text-neutral-500">The seller didn't add a preview.</p>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <span className="text-sm font-medium">The prompt</span>
            {secret && <CopyButton text={secret.content} />}
          </div>
          {secret ? (
            <pre className="whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed">{secret.content}</pre>
          ) : (
            <div className="relative p-5">
              <p className="select-none text-sm leading-relaxed text-neutral-700 blur-sm">
                You are an expert assistant. Follow these exact steps to produce the result shown above,
                using the tone, structure and details described below so you get the same quality every
                single time you run it…
              </p>
              <div className="absolute inset-0 grid place-items-center">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium shadow">
                  🔒 Unlocks after purchase
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-5 p-6">
          <div className="text-4xl font-semibold tracking-tight">{money(prompt.price_cents)}</div>

          {isOwner ? (
            <p className="rounded-xl bg-neutral-100 p-3 text-sm text-neutral-600">This is your prompt.</p>
          ) : secret ? (
            <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">You own this prompt. It's unlocked below.</p>
          ) : canBuy ? (
            <BuyButton promptId={prompt.id} signedIn={!!user} label={`Buy for ${money(prompt.price_cents)}`} />
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              This seller hasn't finished setting up payments yet.
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-neutral-50 p-3">
              <dt className="text-neutral-500">Sales</dt>
              <dd className="mt-0.5 text-lg font-semibold">{prompt.sales_count}</dd>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <dt className="text-neutral-500">Revenue</dt>
              <dd className="mt-0.5 text-lg font-semibold">{money(prompt.revenue_cents)}</dd>
            </div>
          </dl>

          <p className="text-sm text-neutral-500">
            Sold by <span className="font-medium text-neutral-900">@{prompt.profiles?.username}</span>
          </p>
          <p className="border-t border-neutral-100 pt-4 text-xs text-neutral-500">
            Secure checkout with Stripe. Instant access after payment.
          </p>
        </div>
      </aside>
    </div>
  );
}
