"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ next }) {
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    const password = form.get("password");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: form.get("username") },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) return setMessage({ type: "error", text: error.message });
      if (!data.session) {
        return setMessage({ type: "ok", text: "Check your email to confirm your account." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMessage({ type: "error", text: error.message });
    }

    window.location.href = next;
  }

  return (
    <div className="card p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {mode === "signin" ? "Sign in to buy or sell prompts." : "It takes 10 seconds."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label">Username</label>
            <input name="username" required className="input" placeholder="promptwizard" />
          </div>
        )}
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="input" placeholder="you@email.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required minLength={6} className="input" />
        </div>

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-red-600" : "text-green-700"}`}>
            {message.text}
          </p>
        )}

        <button disabled={loading} className="btn w-full">
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
        className="mt-5 w-full text-center text-sm text-neutral-500 hover:text-neutral-900"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
