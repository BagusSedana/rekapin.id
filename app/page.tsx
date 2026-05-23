import { keluarAction } from "@/app/actions/auth";
import { DashboardSummary } from "@/components/dashboard-summary";
import { ExportButtons } from "@/components/export-buttons";
import { LoadingButton } from "@/components/loading-button";
import { LoginForm } from "@/components/login-form";
import { ManualTransactionForm } from "@/components/manual-transaction-form";
import { SubscriptionCard } from "@/components/subscription-card";
import { TransactionList } from "@/components/transaction-list";
import { UploadReceiptForm } from "@/components/upload-receipt-form";
import { getMissingSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchTransactionsForUser } from "@/lib/transactions";

export const dynamic = "force-dynamic";

function SetupNotice() {
  const missingEnv = getMissingSupabaseEnv();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-6">
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h1 className="text-xl font-bold text-amber-900">Setup Environment Dulu</h1>
        <p className="mt-2 text-sm text-amber-900">
          Project sudah berjalan, tapi variabel Supabase belum lengkap.
        </p>
        <ul className="mt-3 list-inside list-disc text-sm text-amber-900">
          {missingEnv.map((envName) => (
            <li key={envName}>{envName}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-amber-900">
          Salin <code>.env.example</code> jadi <code>.env.local</code> lalu isi nilainya.
        </p>
      </section>
    </main>
  );
}

function PublicLanding() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Rekapin.id
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
          Rekap pembayaran UMKM tanpa ribet
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Upload bukti transfer, AI baca otomatis, lalu jadi tabel transaksi yang siap
          dicek dan diekspor.
        </p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Masuk ke Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Cukup email, tanpa password. Link login akan dikirim ke inbox kamu.
        </p>
        <div className="mt-4">
          <LoginForm />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-900">Upload Bukti Bayar</p>
          <p className="mt-1 text-xs text-slate-600">Jepret dari HP, langsung proses.</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-900">Edit & Tandai Status</p>
          <p className="mt-1 text-xs text-slate-600">
            Lunas/belum lunas, plus catatan.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-900">Export Instan</p>
          <p className="mt-1 text-xs text-slate-600">Unduh Excel atau PDF kapan pun.</p>
        </div>
      </section>
    </main>
  );
}

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return <PublicLanding />;
  }

  const { data: transactions, error } = await fetchTransactionsForUser(
    supabase,
    user.id,
    200
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-6">
      <header className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Rekapin.id Dashboard
            </p>
            <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
              Halo, siap rekap pembayaran hari ini?
            </h1>
            <p className="mt-1 text-xs text-slate-600">{user.email}</p>
          </div>

          <form action={keluarAction} className="w-28">
            <LoadingButton
              idleText="Keluar"
              loadingText="Keluar..."
              className="h-10 rounded-lg bg-slate-100 text-sm text-slate-800 hover:bg-slate-200"
            />
          </form>
        </div>
      </header>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          Gagal memuat transaksi: {error}
        </div>
      ) : null}

      <section className="mt-4">
        <DashboardSummary transactions={transactions} />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">
          1) Upload Bukti Transfer
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Foto screenshot mutasi/bukti transfer, sistem akan baca otomatis.
        </p>
        <div className="mt-4">
          <UploadReceiptForm />
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">
          2) Tambah Manual (Jika Perlu)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Untuk transaksi yang belum sempat diupload.
        </p>
        <div className="mt-4">
          <ManualTransactionForm />
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">3) Export Data</h2>
        <p className="mt-1 text-sm text-slate-600">
          Unduh rekap untuk pembukuan atau kirim ke tim.
        </p>
        <div className="mt-4">
          <ExportButtons />
        </div>
      </section>

      <section className="mt-4">
        <SubscriptionCard />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Daftar Transaksi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ubah status dan catatan langsung dari sini.
        </p>
        <div className="mt-4">
          <TransactionList transactions={transactions} />
        </div>
      </section>
    </main>
  );
}
