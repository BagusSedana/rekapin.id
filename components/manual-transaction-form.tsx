"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createManualTransactionAction } from "@/app/actions/transactions";

type ManualTransactionFormProps = {
  businessId?: string;
};

export function ManualTransactionForm({ businessId }: ManualTransactionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createManualTransactionAction(formData);
      setFeedback(result.message);

      if (result.success) {
        event.currentTarget.reset();
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {businessId ? <input type="hidden" name="businessId" value={businessId} /> : null}

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nama pembayar
          </label>
          <input
            type="text"
            name="payerName"
            required
            placeholder="Contoh: Budi - Jastip Batch 12"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nominal (Rp)
          </label>
          <input
            type="number"
            name="nominal"
            required
            min={1}
            step={1000}
            placeholder="150000"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Metode bayar
          </label>
          <select
            name="metodeBayar"
            defaultValue="TRANSFER"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
          >
            <option value="TRANSFER">Transfer Bank</option>
            <option value="QRIS">QRIS</option>
            <option value="CASH">Cash</option>
            <option value="GOPAY">GoPay</option>
            <option value="OVO">OVO</option>
            <option value="DANA">DANA</option>
            <option value="SHOPEE_PAY">ShopeePay</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tanggal transaksi
          </label>
          <input
            type="date"
            name="tanggal"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            name="status"
            defaultValue="BELUM_LUNAS"
            className="h-12 w-full rounded-xl border border-slate-300 px-4 text-base outline-none ring-emerald-500 transition focus:ring-2"
          >
            <option value="BELUM_LUNAS">Belum Lunas</option>
            <option value="LUNAS">Lunas</option>
            <option value="SEBAGIAN">Sebagian</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Catatan (opsional)
          </label>
          <textarea
            name="catatan"
            rows={3}
            placeholder="Contoh: pembayaran DP"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none ring-emerald-500 transition focus:ring-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Menyimpan transaksi..." : "Simpan Transaksi Manual"}
      </button>

      {feedback ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
