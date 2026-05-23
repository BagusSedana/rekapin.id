"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatTanggal, formatTanggalInput } from "@/lib/utils";
import {
  MetodeBayar,
  StatusBayar,
  type Transaction,
} from "@/lib/types";

type TransactionTableProps = {
  transactions: Transaction[];
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
};

type EditableField =
  | "tanggal"
  | "nama_customer"
  | "nominal"
  | "metode_bayar"
  | "catatan";

type EditingCell = {
  id: string;
  field: EditableField;
} | null;

const METODE_OPTIONS = Object.values(MetodeBayar);
const STATUS_OPTIONS = Object.values(StatusBayar);

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

const STATUS_SELECT_CLASS: Record<StatusBayar, string> = {
  [StatusBayar.LUNAS]: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  [StatusBayar.BELUM_LUNAS]: "bg-rose-50 text-rose-800 ring-rose-200",
  [StatusBayar.SEBAGIAN]: "bg-amber-50 text-amber-800 ring-amber-200",
};

function getStatusLabel(status: StatusBayar) {
  if (status === StatusBayar.LUNAS) return "Lunas";
  if (status === StatusBayar.SEBAGIAN) return "Sebagian";
  return "Belum Lunas";
}

function getMonthKey(date: string) {
  if (!date) return "";
  return date.slice(0, 7);
}

function getMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeString(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
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

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: StatusBayar;
  disabled: boolean;
  onChange: (value: StatusBayar) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as StatusBayar)}
      className={`h-10 w-full min-w-36 rounded-lg px-3 text-sm font-semibold outline-none ring-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${STATUS_SELECT_CLASS[value]}`}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {getStatusLabel(status)}
        </option>
      ))}
    </select>
  );
}

function EditableCell({
  transaction,
  field,
  editingCell,
  setEditingCell,
  disabled,
  onSave,
}: {
  transaction: Transaction;
  field: EditableField;
  editingCell: EditingCell;
  setEditingCell: (cell: EditingCell) => void;
  disabled: boolean;
  onSave: (id: string, updates: Partial<Transaction>) => Promise<void>;
}) {
  const isEditing = editingCell?.id === transaction.id && editingCell.field === field;
  const rawValue = transaction[field];
  const initialValue =
    field === "tanggal"
      ? formatTanggalInput(transaction.tanggal)
      : rawValue === null
        ? ""
        : String(rawValue);
  const [draftValue, setDraftValue] = useState(initialValue);

  if (isEditing) {
    const commit = async () => {
      setEditingCell(null);

      if (draftValue === initialValue) return;

      if (field === "nominal") {
        const nominal = Number(draftValue);
        if (!Number.isFinite(nominal) || nominal <= 0) {
          toast.error("Nominal harus lebih dari Rp 0");
          return;
        }

        await onSave(transaction.id, { nominal });
        return;
      }

      if (field === "metode_bayar") {
        await onSave(transaction.id, {
          metode_bayar: draftValue as MetodeBayar,
        });
        return;
      }

      if (field === "nama_customer" || field === "catatan") {
        await onSave(transaction.id, {
          [field]: normalizeString(draftValue),
        } as Partial<Transaction>);
        return;
      }

      await onSave(transaction.id, { tanggal: draftValue });
    };

    if (field === "metode_bayar") {
      return (
        <select
          autoFocus
          value={draftValue}
          disabled={disabled}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commit}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        >
          {METODE_OPTIONS.map((metode) => (
            <option key={metode} value={metode}>
              {metode}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        autoFocus
        type={field === "tanggal" ? "date" : field === "nominal" ? "number" : "text"}
        value={draftValue}
        disabled={disabled}
        min={field === "nominal" ? 1 : undefined}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setDraftValue(initialValue);
            setEditingCell(null);
          }
        }}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
      />
    );
  }

  const displayValue = (() => {
    if (field === "tanggal") return formatTanggal(transaction.tanggal);
    if (field === "nominal") return formatRupiah(transaction.nominal);
    if (field === "metode_bayar") return <MethodBadge metode={transaction.metode_bayar} />;
    return normalizeString(String(rawValue ?? "")) ?? "-";
  })();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setDraftValue(initialValue);
        setEditingCell({ id: transaction.id, field });
      }}
      className="min-h-10 w-full rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {displayValue}
    </button>
  );
}

export function TransactionTable({
  transactions,
  onUpdate,
  onDelete,
  onAdd,
}: TransactionTableProps) {
  const [monthFilter, setMonthFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monthOptions = useMemo(() => {
    const monthKeys = new Set(
      transactions.map((transaction) => getMonthKey(transaction.tanggal)).filter(Boolean)
    );

    return Array.from(monthKeys).sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesMonth =
        monthFilter === "all" || getMonthKey(transaction.tanggal) === monthFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (transaction.nama_customer ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesMonth && matchesSearch;
    });
  }, [monthFilter, searchQuery, transactions]);

  const totalNominal = filteredTransactions.reduce(
    (total, transaction) => total + transaction.nominal,
    0
  );

  const saveUpdate = async (id: string, updates: Partial<Transaction>) => {
    try {
      setSavingId(id);
      await onUpdate(id, updates);
      toast.success("Tersimpan");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan perubahan.";
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success("Transaksi dihapus");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus transaksi.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const renderStatusSelect = (transaction: Transaction) => (
    <StatusSelect
      value={transaction.status}
      disabled={savingId === transaction.id}
      onChange={(status) => saveUpdate(transaction.id, { status })}
    />
  );

  const renderDeleteButton = (transaction: Transaction) => (
    <button
      type="button"
      disabled={deletingId === transaction.id}
      onClick={() => deleteRow(transaction.id)}
      aria-label="Hapus transaksi"
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="space-y-4">
      <Toaster richColors position="top-center" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_minmax(220px,1fr)]">
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          >
            <option value="all">Semua bulan</option>
            {monthOptions.map((monthKey) => (
              <option key={monthKey} value={monthKey}>
                {getMonthLabel(monthKey)}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama customer"
              className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            />
          </div>
        </div>

        <Button type="button" onClick={onAdd} className="h-12 shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Manual
        </Button>
      </div>

      <div className="space-y-3 sm:hidden">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Belum ada transaksi.
          </div>
        ) : null}

        {filteredTransactions.map((transaction) => (
          <article
            key={transaction.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <EditableCell
                  transaction={transaction}
                  field="nama_customer"
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  disabled={savingId === transaction.id}
                  onSave={saveUpdate}
                />
              </div>
              <div className="w-32 text-right">
                <EditableCell
                  transaction={transaction}
                  field="nominal"
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  disabled={savingId === transaction.id}
                  onSave={saveUpdate}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <EditableCell
                transaction={transaction}
                field="tanggal"
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                disabled={savingId === transaction.id}
                onSave={saveUpdate}
              />
              <EditableCell
                transaction={transaction}
                field="metode_bayar"
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                disabled={savingId === transaction.id}
                onSave={saveUpdate}
              />
              {renderStatusSelect(transaction)}
            </div>

            {transaction.catatan ? (
              <div className="mt-3">
                <EditableCell
                  transaction={transaction}
                  field="catatan"
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  disabled={savingId === transaction.id}
                  onSave={saveUpdate}
                />
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                <EditableCell
                  transaction={transaction}
                  field="catatan"
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  disabled={savingId === transaction.id}
                  onSave={saveUpdate}
                />
              </div>
            )}

            <div className="mt-3 flex justify-end">{renderDeleteButton(transaction)}</div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Tanggal</th>
              <th className="px-3 py-3 font-semibold">Nama Customer</th>
              <th className="px-3 py-3 font-semibold">Nominal</th>
              <th className="px-3 py-3 font-semibold">Metode Bayar</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Catatan</th>
              <th className="px-3 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  Belum ada transaksi.
                </td>
              </tr>
            ) : null}

            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="align-top">
                <td className="w-36 px-2 py-2">
                  <EditableCell
                    transaction={transaction}
                    field="tanggal"
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    disabled={savingId === transaction.id}
                    onSave={saveUpdate}
                  />
                </td>
                <td className="min-w-40 px-2 py-2">
                  <EditableCell
                    transaction={transaction}
                    field="nama_customer"
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    disabled={savingId === transaction.id}
                    onSave={saveUpdate}
                  />
                </td>
                <td className="w-40 px-2 py-2 font-semibold text-slate-900">
                  <EditableCell
                    transaction={transaction}
                    field="nominal"
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    disabled={savingId === transaction.id}
                    onSave={saveUpdate}
                  />
                </td>
                <td className="w-40 px-2 py-2">
                  <EditableCell
                    transaction={transaction}
                    field="metode_bayar"
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    disabled={savingId === transaction.id}
                    onSave={saveUpdate}
                  />
                </td>
                <td className="w-44 px-2 py-2">{renderStatusSelect(transaction)}</td>
                <td className="min-w-48 px-2 py-2">
                  <EditableCell
                    transaction={transaction}
                    field="catatan"
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    disabled={savingId === transaction.id}
                    onSave={saveUpdate}
                  />
                </td>
                <td className="w-16 px-3 py-2 text-right">
                  {renderDeleteButton(transaction)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50">
            <tr>
              <td colSpan={7} className="px-4 py-4 text-right font-bold text-slate-900">
                Total: {formatRupiah(totalNominal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right text-base font-bold text-slate-900 sm:hidden">
        Total: {formatRupiah(totalNominal)}
      </div>
    </div>
  );
}

