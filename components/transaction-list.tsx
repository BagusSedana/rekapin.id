"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateTransactionAction } from "@/app/actions/transactions";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { MetodeBayar, StatusBayar, type Transaction } from "@/lib/types";

type TransactionListProps = {
  transactions: Transaction[];
};

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, string>>({});

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
    transactionId: string
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPendingId(transactionId);

    startTransition(async () => {
      const result = await updateTransactionAction(formData);
      setMessages((prev) => ({ ...prev, [transactionId]: result.message }));

      if (result.success) {
        router.refresh();
      }

      setPendingId(null);
    });
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        Belum ada transaksi. Coba upload bukti bayar pertama kamu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((trx) => {
        const rowPending = isPending && pendingId === trx.id;

        return (
          <form
            key={trx.id}
            onSubmit={(event) => handleSubmit(event, trx.id)}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="transactionId" value={trx.id} />

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {trx.nama_customer ?? "Customer tidak tercatat"}
                </p>
                <p className="text-xs text-slate-500">
                  {trx.metode_bayar === MetodeBayar.TRANSFER
                    ? "Transfer bank"
                    : trx.metode_bayar}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-emerald-700">
                  {formatRupiah(trx.nominal)}
                </p>
                <p className="text-xs text-slate-500">{formatTanggal(trx.tanggal)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                name="status"
                defaultValue={trx.status}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none ring-emerald-500 transition focus:ring-2"
              >
                <option value={StatusBayar.BELUM_LUNAS}>Belum Lunas</option>
                <option value={StatusBayar.LUNAS}>Lunas</option>
                <option value={StatusBayar.SEBAGIAN}>Sebagian</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Catatan</label>
              <textarea
                name="catatan"
                rows={2}
                defaultValue={trx.catatan ?? ""}
                placeholder="Tambahkan catatan jika perlu"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-emerald-500 transition focus:ring-2"
              />
            </div>

            <button
              type="submit"
              disabled={rowPending}
              className="h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rowPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>

            {messages[trx.id] ? (
              <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {messages[trx.id]}
              </p>
            ) : null}
          </form>
        );
      })}
    </div>
  );
}
