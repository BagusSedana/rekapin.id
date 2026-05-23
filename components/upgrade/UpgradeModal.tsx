"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type PaidPlan = "STARTER" | "PRO" | "ADMIN";

type UpgradeModalProps = {
  triggerLabel?: string;
  defaultPlan?: PaidPlan;
};

type SnapPayOptions = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapPayOptions) => void;
    };
  }
}

const PLANS: Array<{
  id: PaidPlan;
  name: string;
  price: number;
  description: string;
  recommended?: boolean;
  features: string[];
}> = [
  {
    id: "STARTER",
    name: "Starter",
    price: 29000,
    description: "Untuk UMKM yang mulai rutin rekap bukti bayar.",
    features: ["Kuota transaksi lebih besar", "Export laporan", "Watermark ringan"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 99000,
    description: "Untuk bisnis aktif dengan proses harian lebih padat.",
    recommended: true,
    features: ["Prioritas proses AI", "Export PDF tanpa watermark", "Riwayat operasional"],
  },
  {
    id: "ADMIN",
    name: "Admin",
    price: 199000,
    description: "Untuk tim yang butuh kapasitas dan kontrol lebih tinggi.",
    features: ["Kuota terbesar", "Cocok untuk multi-admin", "Dukungan operasional"],
  },
];

export function UpgradeModal({
  triggerLabel = "Upgrade Plan",
  defaultPlan = "PRO",
}: UpgradeModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(defaultPlan);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlan | null>(null);

  const startPayment = async (plan: PaidPlan) => {
    setSelectedPlan(plan);
    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { token?: string; redirect_url?: string; message?: string }
        | null;

      if (!response.ok || !payload?.token) {
        throw new Error(payload?.message ?? "Gagal membuat pembayaran.");
      }

      if (!window.snap?.pay) {
        if (payload.redirect_url) {
          window.location.href = payload.redirect_url;
          return;
        }

        throw new Error("Midtrans Snap belum siap. Coba refresh halaman.");
      }

      window.snap.pay(payload.token, {
        onSuccess: () => {
          toast.success("Upgrade berhasil!");
          setIsOpen(false);
          router.refresh();
        },
        onPending: () => {
          toast.message("Pembayaran sedang diproses.");
          setIsOpen(false);
          router.refresh();
        },
        onError: () => {
          toast.error("Pembayaran belum berhasil. Coba lagi.");
        },
        onClose: () => {
          setLoadingPlan(null);
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kendala pembayaran.";
      toast.error(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {triggerLabel}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-4xl rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Upgrade Rekapin.id
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pilih paket bulanan yang paling pas untuk volume transaksi kamu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Tutup modal upgrade"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isLoading = loadingPlan === plan.id;

                return (
                  <section
                    key={plan.id}
                    className={cn(
                      "relative rounded-lg border bg-white p-4",
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-100"
                        : "border-slate-200",
                      plan.recommended ? "shadow-md" : "shadow-sm"
                    )}
                  >
                    {plan.recommended ? (
                      <span className="absolute right-3 top-3 rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                        Rekomendasi
                      </span>
                    ) : null}

                    <h3 className="text-lg font-bold text-slate-950">{plan.name}</h3>
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {formatRupiah(plan.price)}
                      <span className="text-sm font-semibold text-slate-500">
                        /bulan
                      </span>
                    </p>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                      {plan.description}
                    </p>

                    <ul className="mt-4 space-y-2 text-sm text-slate-700">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() => startPayment(plan.id)}
                      disabled={loadingPlan !== null}
                      className={cn(
                        "mt-5 h-11 w-full rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                        plan.recommended
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-950 text-white hover:bg-slate-800"
                      )}
                    >
                      {isLoading ? "Membuka Midtrans..." : "Pilih Plan"}
                    </button>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
