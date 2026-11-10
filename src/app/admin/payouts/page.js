import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const { user } = await getUser();
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user || !admins.includes(user.email?.toLowerCase())) notFound();
}

async function markPaid(formData) {
  "use server";
  await requireAdmin();
  const ids = JSON.parse(formData.get("ids"));
  await createAdminClient()
    .from("purchases")
    .update({ payout_status: "paid", paid_out_at: new Date().toISOString() })
    .in("id", ids)
    .eq("payout_status", "pending");
  revalidatePath("/admin/payouts");
}

function describe(d) {
  if (!d) return "No payout details saved";
  if (d.method === "upi") return `UPI: ${d.upi_id}`;
  if (d.method === "paypal") return `PayPal: ${d.paypal_email}`;
  return `Bank: ${d.bank_name} · ${d.account_number} · ${d.routing_code}`;
}

export default async function AdminPayouts() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("purchases")
    .select("id, seller_payout_cents, created_at, prompts!inner(title, seller_id)")
    .eq("payout_status", "pending")
    .order("created_at");

  const bySeller = {};
  for (const p of pending || []) {
    const id = p.prompts.seller_id;
    bySeller[id] ??= { ids: [], total: 0, count: 0 };
    bySeller[id].ids.push(p.id);
    bySeller[id].total += p.seller_payout_cents;
    bySeller[id].count += 1;
  }

  const sellerIds = Object.keys(bySeller);
  const [{ data: profiles }, { data: details }] = sellerIds.length
    ? await Promise.all([
        admin.from("profiles").select("id, username").in("id", sellerIds),
        admin.from("payout_details").select("*").in("user_id", sellerIds),
      ])
    : [{ data: [] }, { data: [] }];

  const grandTotal = Object.values(bySeller).reduce((s, x) => s + x.total, 0);

  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Manual payouts</h1>
      <p className="mt-2 text-neutral-600">
        You owe <span className="font-semibold text-neutral-900">{money(grandTotal)}</span> to{" "}
        {sellerIds.length} seller{sellerIds.length === 1 ? "" : "s"}. Send the money, then mark it paid.
      </p>

      <div className="mt-8 space-y-4">
        {sellerIds.length === 0 && <div className="card p-8 text-center text-sm text-neutral-500">All caught up.</div>}
        {sellerIds.map((id) => {
          const d = details?.find((x) => x.user_id === id);
          const u = profiles?.find((x) => x.id === id);
          return (
            <div key={id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="font-medium">
                  @{u?.username} <span className="text-neutral-500">· {d?.account_name} · {d?.country}</span>
                </p>
                <p className="mt-1 font-mono text-sm text-neutral-700">{describe(d)}</p>
                <p className="mt-1 text-sm text-neutral-500">{bySeller[id].count} sale(s)</p>
              </div>
              <p className="text-2xl font-semibold">{money(bySeller[id].total)}</p>
              <form action={markPaid}>
                <input type="hidden" name="ids" value={JSON.stringify(bySeller[id].ids)} />
                <button className="btn">Mark as paid</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
