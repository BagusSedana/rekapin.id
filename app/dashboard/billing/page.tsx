import { redirect } from "next/navigation";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const PLAN_PRICE: Record<string, number> = {
  FREE: 0,
  STARTER: 29000,
  PRO: 99000,
  ADMIN: 199000,
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function isRenewalWindow(value: string | null | undefined) {
  if (!value) return false;

  const expiredAt = new Date(value).getTime();
  if (Number.isNaN(expiredAt)) return false;

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  return expiredAt - now <= sevenDaysMs;
}

export default async function BillingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,transaction_count_this_month")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = String(subscription?.plan ?? "FREE");
  const status = String(subscription?.status ?? "ACTIVE");
  const currentPeriodEnd =
    typeof subscription?.current_period_end === "string"
      ? subscription.current_period_end
      : null;
  const transactionCount =
    typeof subscription?.transaction_count_this_month === "number"
      ? subscription.transaction_count_this_month
      : 0;
  const isFree = plan === "FREE";
  const canRenew = !isFree && status === "ACTIVE" && isRenewalWindow(currentPeriodEnd);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-950">Billing</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola paket Rekapin.id dan masa aktif subscription.
        </p>
      </header>

      <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Plan saat ini</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{plan}</p>
          <p className="mt-1 text-sm text-slate-600">{status}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tanggal expired</p>
          <p className="mt-2 text-xl font-bold text-slate-950">
            {formatDate(currentPeriodEnd)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {isFree ? "Free plan tidak memiliki masa aktif." : "Periode aktif paket."}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Jumlah transaksi bulan ini
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {transactionCount}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Reset saat upgrade berhasil.
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {isFree ? "Upgrade paket" : "Paket aktif"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {isFree
                ? "Buka kuota lebih besar dan fitur export yang lebih nyaman."
                : `Biaya paket saat ini ${formatRupiah(PLAN_PRICE[plan] ?? 0)} per bulan.`}
            </p>
          </div>

          {isFree ? <UpgradeModal triggerLabel="Upgrade Plan" /> : null}
          {canRenew ? (
            <UpgradeModal
              triggerLabel="Perpanjang"
              defaultPlan={plan === "ADMIN" ? "ADMIN" : plan === "STARTER" ? "STARTER" : "PRO"}
            />
          ) : null}
        </div>

        {!isFree && !canRenew ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Tombol perpanjang akan muncul 7 hari sebelum expired.
          </p>
        ) : null}
      </section>
    </main>
  );
}
