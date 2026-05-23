import { formatRupiah } from "@/lib/utils";
import { StatusBayar, type Transaction } from "@/lib/types";

type TransactionSummaryProps = {
  transactions: Transaction[];
};

export function TransactionSummary({ transactions }: TransactionSummaryProps) {
  const totalNominal = transactions.reduce(
    (total, transaction) => total + transaction.nominal,
    0
  );
  const totalLunas = transactions.filter(
    (transaction) => transaction.status === StatusBayar.LUNAS
  ).length;
  const totalBelumLunas = transactions.filter(
    (transaction) => transaction.status === StatusBayar.BELUM_LUNAS
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Total Transaksi</p>
        <p className="mt-1 text-xl font-bold text-slate-900">
          {transactions.length}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Total Nominal</p>
        <p className="mt-1 text-lg font-bold text-emerald-700">
          {formatRupiah(totalNominal)}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Lunas</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{totalLunas}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Belum Lunas</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{totalBelumLunas}</p>
      </div>
    </div>
  );
}

