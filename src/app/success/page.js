import Link from "next/link";
import { fulfillCheckout } from "@/lib/fulfill";

export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }) {
  const { session_id } = await searchParams;
  const result = session_id ? await fulfillCheckout(session_id).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-md py-24 text-center">
      {result?.ok ? (
        <>
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-green-100 text-2xl">✓</div>
          <h1 className="text-3xl font-semibold tracking-tight">It's yours!</h1>
          <p className="mt-2 text-neutral-600">Payment complete. Your prompt is unlocked.</p>
          <Link href={`/prompt/${result.promptId}`} className="btn mt-8">View my prompt</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Payment is processing</h1>
          <p className="mt-2 text-neutral-600">It'll show up in your dashboard in a moment.</p>
          <Link href="/dashboard" className="btn mt-8">Go to dashboard</Link>
        </>
      )}
    </div>
  );
}
