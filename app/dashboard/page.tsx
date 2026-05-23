import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  FileUp,
  Plus,
  ReceiptText,
} from "lucide-react";
import { DashboardBusinessSelect, DashboardPeriodSelector } from "@/components/dashboard";
import { ExportButton } from "@/components/export";
import { ManualTransactionForm } from "@/components/manual-transaction-form";
import { TransactionTable } from "@/components/table/transaction-table";
import { UploadReceiptForm } from "@/components/upload-receipt-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetodeBayar, StatusBayar, type Transaction } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DashboardSearchParams = {
  businessId?: string | string[];
  period?: string | string[];
  start?: string | string[];
  end?: string | string[];
  upload?: string | string[];
  manual?: string | string[];
};

type DashboardPageProps = {
  searchParams?: DashboardSearchParams;
};

type BusinessOption = {
  id: string;
  nama: string;
};

type DashboardPeriod = "today" | "week" | "month" | "custom";

const FREE_TRANSACTION_LIMIT = 50;
const FREE_WARNING_THRESHOLD = 40;
const PERIOD_VALUES = new Set<DashboardPeriod>([
  "today",
  "week",
  "month",
  "custom",
]);

function getSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getSearchParams(searchParams: DashboardSearchParams) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    const normalizedValue = getSearchValue(value);
    if (normalizedValue) params.set(key, normalizedValue);
  });

  return params;
}

function buildDashboardHref(
  searchParams: DashboardSearchParams,
  updates: Record<string, string | null>
) {
  const params = getSearchParams(searchParams);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      params.delete(key);
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}

function resolvePeriod(searchParams: DashboardSearchParams) {
  const rawPeriod = getSearchValue(searchParams.period) ?? "month";
  const period = PERIOD_VALUES.has(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : "month";
  const today = new Date();
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = today;

  if (period === "today") {
    start = today;
    end = today;
  }

  if (period === "week") {
    start = getWeekStart(today);
    end = today;
  }

  if (period === "custom") {
    const customStart = parseDateInput(getSearchValue(searchParams.start));
    const customEnd = parseDateInput(getSearchValue(searchParams.end));

    if (customStart && customEnd) {
      start = customStart <= customEnd ? customStart : customEnd;
      end = customStart <= customEnd ? customEnd : customStart;
    }
  }

  return {
    period,
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function getMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(today),
  };
}

function getPeriodLabel(period: DashboardPeriod, startDate: string, endDate: string) {
  if (period === "today") return "Hari Ini";
  if (period === "week") return "Minggu Ini";
  if (period === "custom") return `${startDate} - ${endDate}`;
  return "Bulan Ini";
}

function getMostUsedMethod(transactions: Transaction[]) {
  const counts = new Map<MetodeBayar, { method: MetodeBayar; count: number }>();

  Object.values(MetodeBayar).forEach((method) => {
    counts.set(method, { method, count: 0 });
  });

  transactions.forEach((transaction) => {
    const current = counts.get(transaction.metode_bayar);
    if (current) current.count += 1;
  });

  return Array.from(counts.values())
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)[0];
}

function getSummary(transactions: Transaction[]) {
  const today = formatDateInput(new Date());
  const mostUsedMethod = getMostUsedMethod(transactions);

  return {
    totalPemasukan: transactions.reduce(
      (total, transaction) =>
        transaction.status === StatusBayar.LUNAS
          ? total + transaction.nominal
          : total,
      0
    ),
    totalPiutang: transactions.reduce(
      (total, transaction) =>
        transaction.status === StatusBayar.BELUM_LUNAS
          ? total + transaction.nominal
          : total,
      0
    ),
    transaksiHariIni: transactions.filter(
      (transaction) => transaction.tanggal === today
    ).length,
    mostUsedMethod,
  };
}

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function EmptyTransactionsState({ uploadHref }: { uploadHref: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <ReceiptText className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-950">Belum ada transaksi</h2>
      <p className="mt-1 text-sm text-slate-600">
        Upload bukti pembayaran pertama kamu di atas
      </p>
      <Link
        href={uploadHref}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        <FileUp className="h-4 w-4" aria-hidden="true" />
        Upload Sekarang
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams = {},
}: DashboardPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [
    businessesResponse,
    subscriptionResponse,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id,nama")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end,transaction_count_this_month")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const businesses = (businessesResponse.data ?? []).map((business) => ({
    id: String(business.id),
    nama: String(business.nama ?? "Bisnis Saya"),
  })) satisfies BusinessOption[];

  if (businesses.length === 0) {
    redirect("/onboarding");
  }

  const requestedBusinessId = getSearchValue(searchParams.businessId);
  const selectedBusiness =
    businesses.find((business) => business.id === requestedBusinessId) ??
    businesses[0];
  const { period, startDate, endDate } = resolvePeriod(searchParams);
  const monthRange = getMonthRange();

  const [transactionsResponse, monthCountResponse] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id,user_id,business_id,tanggal,nama_customer,nominal,metode_bayar,status,catatan,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .eq("business_id", selectedBusiness.id)
      .gte("tanggal", startDate)
      .lte("tanggal", endDate)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("business_id", selectedBusiness.id)
      .gte("tanggal", monthRange.startDate)
      .lte("tanggal", monthRange.endDate),
  ]);

  const transactions = (transactionsResponse.data ?? []) as Transaction[];
  const subscription = subscriptionResponse.data;
  const plan = String(subscription?.plan ?? "FREE");
  const isFreePlan = plan === "FREE";
  const monthlyTransactionCount = monthCountResponse.count ?? 0;
  const shouldWarnFreeLimit =
    isFreePlan && monthlyTransactionCount > FREE_WARNING_THRESHOLD;
  const uploadDisabled =
    isFreePlan && monthlyTransactionCount >= FREE_TRANSACTION_LIMIT;
  const summary = getSummary(transactions);
  const periodLabel = getPeriodLabel(period, startDate, endDate);
  const customRange =
    period === "custom" ? { start: startDate, end: endDate } : undefined;
  const isPaidUser = subscription?.status === "ACTIVE" && !isFreePlan;
  const uploadHref = buildDashboardHref(searchParams, { upload: "1" });
  const closeUploadHref = buildDashboardHref(searchParams, { upload: null });
  const manualHref = buildDashboardHref(searchParams, { manual: "1" });
  const closeManualHref = buildDashboardHref(searchParams, { manual: null });
  const isUploadOpen = getSearchValue(searchParams.upload) === "1";
  const isManualOpen = getSearchValue(searchParams.manual) === "1";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <DashboardBusinessSelect
            businesses={businesses}
            selectedBusinessId={selectedBusiness.id}
          />
          <p className="mt-1 text-sm text-slate-600">
            Dashboard transaksi untuk {periodLabel.toLowerCase()}.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ExportButton
            businessId={selectedBusiness.id}
            period={period}
            customRange={customRange}
            isPaidUser={isPaidUser}
            disabled={transactions.length === 0}
          />
          {uploadDisabled ? (
            <button
              type="button"
              disabled
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Upload Bukti
            </button>
          ) : (
            <Link
              href={uploadHref}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Upload Bukti
            </Link>
          )}
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label="Total pemasukan bulan ini"
          value={formatRupiah(summary.totalPemasukan)}
          helper={`${transactions.length} transaksi di filter aktif`}
        />
        <SummaryCard
          label="Piutang belum lunas"
          value={formatRupiah(summary.totalPiutang)}
        />
        <SummaryCard
          label="Transaksi hari ini"
          value={`${summary.transaksiHariIni}`}
          helper="Berdasarkan tanggal transaksi"
        />
        <SummaryCard
          label="Terbanyak"
          value={
            summary.mostUsedMethod
              ? summary.mostUsedMethod.method
              : "Belum ada"
          }
          helper={
            summary.mostUsedMethod
              ? `${summary.mostUsedMethod.count} transaksi`
              : "Metode bayar belum tersedia"
          }
        />
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
        <DashboardPeriodSelector
          selectedPeriod={period}
          startDate={startDate}
          endDate={endDate}
        />
      </section>

      {isUploadOpen ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Upload Bukti</h2>
              <p className="mt-1 text-sm text-slate-600">
                Upload bukti transfer, lalu sistem akan menyimpan hasil bacaan ke tabel.
              </p>
            </div>
            <Link
              href={closeUploadHref}
              className="text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              Tutup
            </Link>
          </div>

          {uploadDisabled ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Kuota Free plan bulan ini sudah habis. Upgrade untuk lanjut upload.
            </div>
          ) : (
            <UploadReceiptForm businessId={selectedBusiness.id} />
          )}
        </section>
      ) : null}

      {shouldWarnFreeLimit ? (
        <section className="mt-5 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-medium">
              Kamu sudah punya {monthlyTransactionCount} transaksi bulan ini.{" "}
              Free plan dibatasi 50 transaksi/bulan.
            </p>
          </div>
          <Link
            href="/dashboard?upgrade=starter"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Upgrade ke Starter — Rp 29.000/bulan
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Tabel Transaksi</h2>
            <p className="text-sm text-slate-600">
              Default sort: tanggal terbaru di atas.
            </p>
          </div>
        </div>

        <TransactionTable
          transactions={transactions}
          emptyState={<EmptyTransactionsState uploadHref={uploadHref} />}
        />
      </section>

      <section className="mt-5">
        {isManualOpen ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Tambah Transaksi Manual
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pakai form ini untuk transaksi tanpa bukti transfer.
                </p>
              </div>
              <Link
                href={closeManualHref}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Tutup
              </Link>
            </div>
            <ManualTransactionForm businessId={selectedBusiness.id} />
          </div>
        ) : (
          <Link
            href={manualHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Manual
          </Link>
        )}
      </section>
    </main>
  );
}
