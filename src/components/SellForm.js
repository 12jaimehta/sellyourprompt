"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, MODELS } from "@/lib/format";

export default function SellForm({ userId, feePercent }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState("5");
  const [imagePreview, setImagePreview] = useState(null);

  const priceNum = Number(price) || 0;
  const youEarn = (priceNum * (100 - feePercent)) / 100;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    try {
      let preview_image_url = null;
      const file = form.get("image");
      if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
        const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const { error: upErr } = await supabase.storage.from("previews").upload(path, file);
        if (upErr) throw upErr;
        preview_image_url = supabase.storage.from("previews").getPublicUrl(path).data.publicUrl;
      }

      const { data: prompt, error: insErr } = await supabase
        .from("prompts")
        .insert({
          seller_id: userId,
          title: form.get("title"),
          description: form.get("description"),
          category: form.get("category"),
          model: form.get("model"),
          price_cents: Math.round(priceNum * 100),
          preview_output: form.get("preview_output") || null,
          preview_image_url,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { error: secErr } = await supabase
        .from("prompt_secrets")
        .insert({ prompt_id: prompt.id, content: form.get("content") });
      if (secErr) {
        await supabase.from("prompts").delete().eq("id", prompt.id);
        throw secErr;
      }

      window.location.href = `/prompt/${prompt.id}`;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-8">
      <section className="card space-y-5 p-6">
        <h2 className="font-semibold">1. About your prompt</h2>
        <div>
          <label className="label">Title</label>
          <input name="title" required maxLength={90} className="input" placeholder="Viral LinkedIn post writer" />
        </div>
        <div>
          <label className="label">Short description</label>
          <textarea
            name="description"
            required
            rows={3}
            className="input"
            placeholder="What does it do and who is it for?"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Category</label>
            <select name="category" className="input">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Works with</label>
            <select name="model" className="input">
              {MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <div>
          <h2 className="font-semibold">2. Show what it created</h2>
          <p className="mt-1 text-sm text-neutral-500">Everyone can see this. It's what makes people buy.</p>
        </div>
        <div>
          <label className="label">Result image (optional)</label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-500 hover:border-neutral-500">
            {imagePreview ? (
              <img src={imagePreview} alt="" className="max-h-60 rounded-lg" />
            ) : (
              "Click to upload a screenshot of the output"
            )}
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setImagePreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
        </div>
        <div>
          <label className="label">Example output text (optional)</label>
          <textarea
            name="preview_output"
            rows={5}
            className="input"
            placeholder="Paste what the AI gave you when you ran this prompt."
          />
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <div>
          <h2 className="font-semibold">3. The prompt</h2>
          <p className="mt-1 text-sm text-neutral-500">🔒 Hidden. Only people who buy it can see this.</p>
        </div>
        <textarea name="content" required rows={8} className="input font-mono" placeholder="Your full prompt…" />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">4. Price</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-40">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
            <input
              type="number"
              min="1"
              step="0.5"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input pl-8"
            />
          </div>
          <p className="text-sm text-neutral-600">
            You earn <span className="font-semibold text-neutral-900">${youEarn.toFixed(2)}</span> per sale
          </p>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="btn w-full py-3 text-base">
        {loading ? "Publishing…" : "Publish prompt"}
      </button>
    </form>
  );
}
