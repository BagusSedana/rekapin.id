"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type DashboardPeriod = "today" | "week" | "month" | "custom";

type BusinessOption = {
  id: string;
  nama: string;
};

type DashboardQueryControlsProps = {
  businesses: BusinessOption[];
  selectedBusinessId: string;
  selectedPeriod: DashboardPeriod;
  startDate: string;
  endDate: string;
};

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "Minggu ini" },
  { value: "month", label: "Bulan ini" },
  { value: "custom", label: "Custom" },
];

export function DashboardBusinessSelect({
  businesses,
  selectedBusinessId,
}: Pick<
  DashboardQueryControlsProps,
  "businesses" | "selectedBusinessId"
>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateBusiness = (businessId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("businessId", businessId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (businesses.length <= 1) {
    return (
      <p className="truncate text-2xl font-bold text-slate-950">
        {businesses[0]?.nama ?? "Bisnis Saya"}
      </p>
    );
  }

  return (
    <label className="block">
      <span className="sr-only">Pilih bisnis</span>
      <select
        value={selectedBusinessId}
        onChange={(event) => updateBusiness(event.target.value)}
        className="h-11 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-lg font-bold text-slate-950 outline-none ring-emerald-500 transition focus:ring-2"
      >
        {businesses.map((business) => (
          <option key={business.id} value={business.id}>
            {business.nama}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DashboardPeriodSelector({
  selectedPeriod,
  startDate,
  endDate,
}: Pick<
  DashboardQueryControlsProps,
  "selectedPeriod" | "startDate" | "endDate"
>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateQuery = (
    period: DashboardPeriod,
    dates?: { start?: string; end?: string }
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);

    if (period === "custom") {
      params.set("start", dates?.start ?? startDate);
      params.set("end", dates?.end ?? endDate);
    } else {
      params.delete("start");
      params.delete("end");
    }

    router.replace(`${pathname}?${params.toString()}`);
  };

  const updateCustomStart = (value: string) => {
    updateQuery("custom", { start: value, end: endDate });
  };

  const updateCustomEnd = (value: string) => {
    updateQuery("custom", { start: startDate, end: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = selectedPeriod === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateQuery(option.value)}
              className={cn(
                "h-10 rounded-lg px-3 text-sm font-semibold transition",
                isSelected
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {selectedPeriod === "custom" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Dari</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => updateCustomStart(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Sampai</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => updateCustomEnd(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
