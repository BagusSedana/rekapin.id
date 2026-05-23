"use client";

import { useEffect, useMemo, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { formatRupiah } from "@/lib/utils";
import {
  MetodeBayar,
  StatusBayar,
  type Transaction,
} from "@/lib/types";
import {
  PeriodSelector,
  type SummaryPeriod,
} from "@/components/summary/PeriodSelector";

type SummaryCardsProps = {
  transactions: Transaction[];
  selectedPeriod: SummaryPeriod;
  customRange?: { start: Date; end: Date };
  onPeriodChange: (period: string) => void;
};

type BreakdownRow = {
  metode: MetodeBayar;
  count: number;
  total: number;
};

const METODE_OPTIONS = Object.values(MetodeBayar);

const METODE_BADGE_CLASS: Record<MetodeBayar, string> = {
  [MetodeBayar.QRIS]: "bg-sky-100 text-sky-800",
  [MetodeBayar.TRANSFER]: "bg-emerald-100 text-emerald-800",
  [MetodeBayar.CASH]: "bg-slate-100 text-slate-700",
  [MetodeBayar.GOPAY]: "bg-green-200 text-green-900",
  [MetodeBayar.OVO]: "bg-purple-100 text-purple-800",
  [MetodeBayar.DANA]: "bg-cyan-100 text-cyan-800",
  [MetodeBayar.SHOPEE_PAY]: "bg-orange-100 text-orange-800",
  [MetodeBayar.LAINNYA]: "bg-slate-100 text-slate-700",
};

function parseTransactionDate(tanggal: string) {
  const parsedDate = parseISO(tanggal);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getDefaultCustomRange() {
  const today = new Date();

  return {
    start: startOfMonth(today),
    end: endOfDay(today),
  };
}

function getPeriodRange(
  selectedPeriod: SummaryPeriod,
  customRange: { start: Date; end: Date }
) {
  const today = new Date();

  if (selectedPeriod === "today") {
    return { start: startOfDay(today), end: endOfDay(today) };
  }

  if (selectedPeriod === "week") {
    return {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfDay(today),
    };
  }

  if (selectedPeriod === "last_month") {
    const lastMonth = subMonths(today, 1);
    return {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth),
    };
  }

  if (selectedPeriod === "custom") {
    const start = startOfDay(customRange.start);
    const end = endOfDay(customRange.end);

    if (start > end) {
      return { start: startOfDay(customRange.end), end: endOfDay(customRange.start) };
    }

    return {
      start,
      end,
    };
  }

  return {
    start: startOfMonth(today),
    end: endOfDay(today),
  };
}

function MethodBadge({ metode }: { metode: MetodeBayar }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${METODE_BADGE_CLASS[metode]}`}
    >
      {metode}
    </span>
  );
}

function SummaryValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <p
      key={value}
      className={`rekapin-value-fade mt-1 min-h-8 text-2xl font-bold tracking-normal text-slate-900 ${className ?? ""}`}
    >
      {value}
    </p>
  );
}

export function SummaryCards({
  transactions,
  selectedPeriod,
  customRange,
  onPeriodChange,
}: SummaryCardsProps) {
  const [localCustomRange, setLocalCustomRange] = useState(
    customRange ?? getDefaultCustomRange()
  );

  useEffect(() => {
    if (customRange) {
      setLocalCustomRange(customRange);
    }
  }, [customRange]);

  const effectiveRange = useMemo(
    () => getPeriodRange(selectedPeriod, localCustomRange),
    [localCustomRange, selectedPeriod]
  );

  const calculations = useMemo(() => {
    const today = new Date();
    const filteredTransactions = transactions.filter((transaction) => {
      const tanggal = parseTransactionDate(transaction.tanggal);
      if (!tanggal) return false;

      return isWithinInterval(tanggal, effectiveRange);
    });

    const todayTransactions = transactions.filter((transaction) => {
      const tanggal = parseTransactionDate(transaction.tanggal);
      return tanggal ? isSameDay(tanggal, today) : false;
    });

    const breakdownMap = new Map<MetodeBayar, BreakdownRow>();

    METODE_OPTIONS.forEach((metode) => {
      breakdownMap.set(metode, { metode, count: 0, total: 0 });
    });

    let totalPemasukan = 0;
    let totalPiutang = 0;
    let transaksiHariIniTotal = 0;

    filteredTransactions.forEach((transaction) => {
      if (transaction.status === StatusBayar.LUNAS) {
        totalPemasukan += transaction.nominal;
      }

      if (transaction.status === StatusBayar.BELUM_LUNAS) {
        totalPiutang += transaction.nominal;
      }

      const current = breakdownMap.get(transaction.metode_bayar);
      if (current) {
        current.count += 1;
        current.total += transaction.nominal;
      }
    });

    todayTransactions.forEach((transaction) => {
      transaksiHariIniTotal += transaction.nominal;
    });

    const breakdownMetode = Array.from(breakdownMap.values()).filter(
      (row) => row.count > 0
    );

    const terbanyak = [...breakdownMetode].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.total - a.total;
    })[0];

    return {
      totalPemasukan,
      totalPiutang,
      transaksiHariIniCount: todayTransactions.length,
      transaksiHariIniTotal,
      breakdownMetode,
      terbanyak,
    };
  }, [effectiveRange, transactions]);

  return (
    <div className="space-y-4">
      <PeriodSelector
        selectedPeriod={selectedPeriod}
        customRange={localCustomRange}
        onPeriodChange={(period) => onPeriodChange(period)}
        onCustomRangeChange={setLocalCustomRange}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Total Pemasukan</p>
          <SummaryValue
            value={formatRupiah(calculations.totalPemasukan)}
            className="text-emerald-700"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Piutang</p>
          <SummaryValue
            value={formatRupiah(calculations.totalPiutang)}
            className="text-rose-700"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Transaksi Hari Ini</p>
          <SummaryValue
            value={`${calculations.transaksiHariIniCount} transaksi`}
            className="text-slate-900"
          />
          <p
            key={calculations.transaksiHariIniTotal}
            className="rekapin-value-fade text-sm font-semibold text-slate-600"
          >
            {formatRupiah(calculations.transaksiHariIniTotal)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-500">Terbanyak</p>
          <div key={calculations.terbanyak?.metode ?? "empty"} className="rekapin-value-fade mt-2 min-h-8">
            {calculations.terbanyak ? (
              <div className="flex flex-wrap items-center gap-2">
                <MethodBadge metode={calculations.terbanyak.metode} />
                <span className="text-sm font-semibold text-slate-700">
                  {calculations.terbanyak.count} transaksi
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Breakdown Per Metode
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Metode</th>
                <th className="px-4 py-3 font-semibold">Jumlah Transaksi</th>
                <th className="px-4 py-3 text-right font-semibold">Total Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculations.breakdownMetode.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Belum ada transaksi di periode ini.
                  </td>
                </tr>
              ) : null}

              {calculations.breakdownMetode.map((row) => (
                <tr key={row.metode}>
                  <td className="px-4 py-3">
                    <MethodBadge metode={row.metode} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.count}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatRupiah(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
