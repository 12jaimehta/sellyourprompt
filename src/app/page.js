import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PromptCard from "@/components/PromptCard";
import { CATEGORIES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const { q = "", category = "", sort = "top" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("prompts")
    .select("id, title, model, price_cents, sales_count, preview_output, preview_image_url")
    .limit(60);

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);
  query =
    sort === "new"
      ? query.order("created_at", { ascending: false })
      : query.order("sales_count", { ascending: false }).order("created_at", { ascending: false });

  const { data: prompts = [] } = await query;

  const href = (params) => {
    const merged = { q, category, sort, ...params };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v)).toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <>
      <section className="py-16 text-center sm:py-24">
        <p className="mx-auto mb-5 w-fit rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600">
          See the result first. Buy the prompt after.
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Buy and sell AI prompts that actually work.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-neutral-600">
          Every prompt shows what it created. Sales numbers are real, verified by Stripe.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#browse" className="btn">Browse prompts</a>
          <Link href="/sell" className="btn-light">Sell your prompt</Link>
        </div>
      </section>

      <section id="browse" className="scroll-mt-20">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="w-full sm:max-w-xs">
            <input name="q" defaultValue={q} placeholder="Search prompts…" className="input" />
            {category && <input type="hidden" name="category" value={category} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
          </form>
          <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1 text-sm">
            {[
              ["top", "Top selling"],
              ["new", "Newest"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={href({ sort: value })}
                className={`rounded-full px-4 py-1.5 ${sort === value ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {["", ...CATEGORIES].map((c) => (
            <Link
              key={c || "all"}
              href={href({ category: c })}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                category === c
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {c || "All"}
            </Link>
          ))}
        </div>

        {prompts?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {prompts.map((p) => (
              <PromptCard key={p.id} prompt={p} />
            ))}
          </div>
        ) : (
          <div className="card px-6 py-20 text-center">
            <p className="font-medium">No prompts here yet.</p>
            <p className="mt-1 text-sm text-neutral-500">Be the first to list one.</p>
            <Link href="/sell" className="btn mt-6">Sell a prompt</Link>
          </div>
        )}
      </section>
    </>
  );
}
