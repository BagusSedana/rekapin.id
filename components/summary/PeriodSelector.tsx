"use client";

import { formatTanggalInput } from "@/lib/utils";

export type SummaryPeriod = "today" | "week" | "month" | "last_month" | "custom";

type PeriodSelectorProps = {
  selectedPeriod: SummaryPeriod;
  customRange?: { start: Date; end: Date };
  onPeriodChange: (period: SummaryPeriod) => void;
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
};

const PERIOD_OPTIONS: Array<{ value: SummaryPeriod; label: string }> = [
  { value: "today", label: "Hari ini" },
  { value: "week", label: "Minggu ini" },
  { value: "month", label: "Bulan ini" },
  { value: "last_month", label: "Bulan lalu" },
  { value: "custom", label: "Custom" },
];

function parseInputDate(value: string) {
  if (!value) return null;

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function PeriodSelector({
  selectedPeriod,
  customRange,
  onPeriodChange,
  onCustomRangeChange,
}: PeriodSelectorProps) {
  const startValue = customRange ? formatTanggalInput(customRange.start) : "";
  const endValue = customRange ? formatTanggalInput(customRange.end) : "";

  const updateStart = (value: string) => {
    const start = parseInputDate(value);
    if (!start || !customRange) return;

    onCustomRangeChange?.({ start, end: customRange.end });
  };

  const updateEnd = (value: string) => {
    const end = parseInputDate(value);
    if (!end || !customRange) return;

    onCustomRangeChange?.({ start: customRange.start, end });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <label htmlFor="summary-period" className="block text-sm font-medium text-slate-700">
          Periode
        </label>
        <select
          id="summary-period"
          value={selectedPeriod}
          onChange={(event) => onPeriodChange(event.target.value as SummaryPeriod)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2 sm:w-48"
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedPeriod === "custom" ? (
        <div className="grid grid-cols-2 gap-2 sm:w-80">
          <div className="space-y-1.5">
            <label htmlFor="summary-start-date" className="block text-sm font-medium text-slate-700">
              Dari
            </label>
            <input
              id="summary-start-date"
              type="date"
              value={startValue}
              onChange={(event) => updateStart(event.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="summary-end-date" className="block text-sm font-medium text-slate-700">
              Sampai
            </label>
            <input
              id="summary-end-date"
              type="date"
              value={endValue}
              onChange={(event) => updateEnd(event.target.value)}
              className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

