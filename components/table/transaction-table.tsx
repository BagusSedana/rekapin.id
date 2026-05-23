import { Badge } from "@/components/ui";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { StatusBayar, type Transaction } from "@/lib/types";

type TransactionTableProps = {
  transactions: Transaction[];
  emptyState?: React.ReactNode;
};

function getStatusBadge(status: StatusBayar) {
  if (status === StatusBayar.LUNAS) {
    return <Badge tone="green">Lunas</Badge>;
  }

  if (status === StatusBayar.SEBAGIAN) {
    return <Badge tone="yellow">Sebagian</Badge>;
  }

  return <Badge tone="red">Belum Lunas</Badge>;
}

export function TransactionTable({ transactions, emptyState }: TransactionTableProps) {
  if (transactions.length === 0) {
    if (emptyState) return <>{emptyState}</>;

    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
        Belum ada transaksi.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Metode</th>
              <th className="px-4 py-3 font-semibold">Nominal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-4 py-3 text-slate-700">
                  {formatTanggal(transaction.tanggal)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {transaction.nama_customer}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {transaction.metode_bayar}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatRupiah(transaction.nominal)}
                </td>
                <td className="px-4 py-3">{getStatusBadge(transaction.status)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {transaction.catatan ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
