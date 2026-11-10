"use client";

import { useState } from "react";

export default function BuyButton({ promptId, label, signedIn }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function buy() {
    if (!signedIn) {
      window.location.href = `/login?next=/prompt/${promptId}`;
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={buy} disabled={loading} className="btn w-full py-3 text-base">
        {loading ? "Redirecting to Stripe…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
