"use client";

import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { formatRupiah } from "@/lib/format";

const PRO_PRICE = 99000;

export function SubscriptionCard() {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-base font-semibold text-emerald-900">Upgrade ke Pro</h3>
      <p className="mt-1 text-sm text-emerald-800">
        Akses kuota proses AI lebih besar untuk operasional harian.
      </p>
      <p className="mt-2 text-lg font-bold text-emerald-900">
        {formatRupiah(PRO_PRICE)} / bulan
      </p>

      <div className="mt-3">
        <UpgradeModal triggerLabel="Lihat Paket" defaultPlan="PRO" />
      </div>
    </div>
  );
}
