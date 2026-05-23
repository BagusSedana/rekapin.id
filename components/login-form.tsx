"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase";

type LoginFormProps = {
  initialError?: string | null;
};

export function LoginForm({ initialError = null }: LoginFormProps) {
  const [feedback, setFeedback] = useState<string>(initialError ?? "");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();

    startTransition(async () => {
      try {
        setFeedback("");
        setIsSuccess(false);

        const supabase = createClient();
        const origin = window.location.origin;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });

        if (error) {
          setFeedback("Gagal kirim link masuk. Cek email kamu lalu coba lagi.");
          return;
        }

        setIsSuccess(true);
        setFeedback("Cek email kamu! Kami kirim link untuk masuk.");
        form.reset();
      } catch (error) {
        console.error("Login error:", error);
        setFeedback("Terjadi kendala saat mengirim link masuk. Coba lagi sebentar.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Email untuk masuk
      </label>
      <input
        type="email"
        name="email"
        required
        placeholder="contoh@usaha.com"
        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
      />

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Mengirim link masuk..." : "Kirim Link Masuk"}
      </button>

      {feedback ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            isSuccess
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
