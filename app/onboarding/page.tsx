import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams?: {
    error?: string;
  };
};

function getErrorMessage(error?: string) {
  if (error === "nama") {
    return "Nama bisnis minimal 2 karakter.";
  }

  if (error === "simpan") {
    return "Nama bisnis belum bisa disimpan. Coba lagi sebentar.";
  }

  return null;
}

async function createBusinessAction(formData: FormData) {
  "use server";

  const namaBisnis = String(formData.get("namaBisnis") ?? "").trim();

  if (namaBisnis.length < 2) {
    redirect("/onboarding?error=nama");
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { error } = await supabase.from("businesses").insert({
    user_id: user.id,
    nama: namaBisnis,
  });

  if (error) {
    redirect("/onboarding?error=simpan");
  }

  redirect("/dashboard");
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingBusiness) {
    redirect("/dashboard");
  }

  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Rekapin.id</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">
          Setup bisnis pertama
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Masukkan nama bisnis agar transaksi, export, dan kuota bulanan bisa
          dicatat dengan rapi.
        </p>

        <form action={createBusinessAction} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Nama bisnis</span>
            <input
              type="text"
              name="namaBisnis"
              required
              minLength={2}
              placeholder="Contoh: Kopi Senja Makassar"
              className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="h-12 w-full rounded-lg bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700"
          >
            Simpan dan buka dashboard
          </button>
        </form>
      </section>
    </main>
  );
}
