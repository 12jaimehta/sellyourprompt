"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES } from "@/lib/format";

const METHODS = [
  { id: "bank", label: "Bank account" },
  { id: "upi", label: "UPI" },
  { id: "paypal", label: "PayPal" },
];

export default function PayoutChoice({ userId, existing, next = "/sell" }) {
  const [showManual, setShowManual] = useState(Boolean(existing));
  const [method, setMethod] = useState(existing?.method || "bank");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function saveManual(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const val = (k) => (f.get(k) || "").toString().trim() || null;

    const { error } = await createClient()
      .from("payout_details")
      .upsert({
        user_id: userId,
        method,
        account_name: val("account_name"),
        country: val("country"),
        bank_name: method === "bank" ? val("bank_name") : null,
        account_number: method === "bank" ? val("account_number") : null,
        routing_code: method === "bank" ? val("routing_code") : null,
        upi_id: method === "upi" ? val("upi_id") : null,
        paypal_email: method === "paypal" ? val("paypal_email") : null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    window.location.href = next;
  }

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">How do you want to get paid?</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <form action="/api/connect/onboard" method="post" className="card flex flex-col p-6">
          <div className="mb-3 text-2xl">⚡</div>
          <h3 className="font-semibold">Stripe</h3>
          <p className="mt-1 flex-1 text-sm text-neutral-600">
            Automatic. Money goes to your bank via Stripe after every sale.
          </p>
          <button className="btn mt-5">Connect Stripe</button>
        </form>

        <div className={`card flex flex-col p-6 ${showManual ? "border-neutral-900" : ""}`}>
          <div className="mb-3 text-2xl">🏦</div>
          <h3 className="font-semibold">Bank, UPI or PayPal</h3>
          <p className="mt-1 flex-1 text-sm text-neutral-600">
            No Stripe needed. We send your earnings to you manually, every week.
          </p>
          <button type="button" onClick={() => setShowManual(true)} className="btn-light mt-5">
            {existing ? "Edit details" : "Use this instead"}
          </button>
        </div>
      </div>

      {showManual && (
        <form onSubmit={saveManual} className="card space-y-5 p-6">
          <div className="flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1 text-sm">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`flex-1 rounded-full px-4 py-2 ${method === m.id ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name (as on account)</label>
              <input name="account_name" required defaultValue={existing?.account_name || ""} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <select name="country" required defaultValue={existing?.country || ""} className="input">
                <option value="" disabled>
                  Select your country
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {method === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Bank name</label>
                <input name="bank_name" required defaultValue={existing?.bank_name || ""} className="input" />
              </div>
              <div>
                <label className="label">Account number / IBAN</label>
                <input name="account_number" required defaultValue={existing?.account_number || ""} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">IFSC / SWIFT / routing code</label>
                <input name="routing_code" required defaultValue={existing?.routing_code || ""} className="input" />
              </div>
            </div>
          )}

          {method === "upi" && (
            <div>
              <label className="label">UPI ID</label>
              <input
                name="upi_id"
                required
                pattern="[\w.\-]+@[\w]+"
                defaultValue={existing?.upi_id || ""}
                className="input"
                placeholder="yourname@okaxis"
              />
            </div>
          )}

          {method === "paypal" && (
            <div>
              <label className="label">PayPal email</label>
              <input name="paypal_email" type="email" required defaultValue={existing?.paypal_email || ""} className="input" />
            </div>
          )}

          <p className="text-xs text-neutral-500">
            🔒 Only you can see these details. We use them only to send your earnings.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn w-full">
            {loading ? "Saving…" : "Save and continue"}
          </button>
        </form>
      )}
    </div>
  );
}
