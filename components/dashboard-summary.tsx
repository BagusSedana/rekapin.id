import { formatRupiah } from "@/lib/format";
import { StatusBayar, type Transaction } from "@/lib/types";

type DashboardSummaryProps = {
  transactions: Transaction[];
};

export function DashboardSummary({ transactions }: DashboardSummaryProps) {
  const totalTransaksi = transactions.length;
  const totalNilai = transactions.reduce((acc, trx) => acc + trx.nominal, 0);
  const totalLunas = transactions.filter(
    (trx) => trx.status === StatusBayar.LUNAS
  ).length;
  const totalBelumLunas = totalTransaksi - totalLunas;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs text-slate-500">Total Transaksi</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{totalTransaksi}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs text-slate-500">Total Nilai</p>
        <p className="mt-1 text-lg font-bold text-emerald-700">
          {formatRupiah(totalNilai)}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs text-slate-500">Lunas</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{totalLunas}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs text-slate-500">Belum Lunas</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{totalBelumLunas}</p>
      </div>
    </div>
  );
}
