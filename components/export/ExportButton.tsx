"use client";

import { useState } from "react";
import {
  ChevronDown,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";

type ExportType = "excel" | "pdf";

type ExportButtonProps = {
  businessId: string;
  period: string;
  customRange?: { start: Date | string; end: Date | string };
  isPaidUser?: boolean;
  disabled?: boolean;
};

function getFileNameFromHeader(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? fallback;
}

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeCustomRange(customRange?: { start: Date | string; end: Date | string }) {
  if (!customRange) return undefined;

  return {
    start: serializeDate(customRange.start),
    end: serializeDate(customRange.end),
  };
}

export function ExportButton({
  businessId,
  period,
  customRange,
  isPaidUser = false,
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<ExportType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const downloadFile = async (
    type: ExportType,
    options: { skipUpgradeModal?: boolean } = {}
  ) => {
    if (type === "pdf" && !isPaidUser && !options.skipUpgradeModal) {
      setIsOpen(false);
      setShowUpgradeModal(true);
      return;
    }

    setLoadingType(type);
    setIsOpen(false);

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          businessId,
          period,
          customRange: serializeCustomRange(customRange),
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(errorPayload?.message ?? "Gagal membuat file export.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getFileNameFromHeader(
        response.headers.get("Content-Disposition"),
        type === "excel" ? "laporan-transaksi.xlsx" : "laporan-transaksi.pdf"
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success("File berhasil diunduh");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kendala saat export.";
      toast.error(message);
    } finally {
      setLoadingType(null);
    }
  };

  const isLoading = loadingType !== null;

  return (
    <div className="relative inline-block w-full sm:w-auto">
      <Toaster richColors position="top-center" />

      <Button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        className="h-12 w-full sm:w-auto"
      >
        {!isLoading ? <Download className="h-4 w-4" aria-hidden="true" /> : null}
        {loadingType === "excel"
          ? "Menyiapkan Excel..."
          : loadingType === "pdf"
            ? "Menyiapkan PDF..."
            : "Export"}
        {!isLoading ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-full min-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg sm:w-64">
          <button
            type="button"
            onClick={() => downloadFile("excel")}
            className="flex h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            Download Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => downloadFile("pdf")}
            className="flex h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-rose-700" aria-hidden="true" />
            Download PDF
          </button>
        </div>
      ) : null}

      {showUpgradeModal ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/50 p-4 sm:items-center sm:justify-center">
          <div className="w-full rounded-xl bg-white p-5 shadow-xl sm:max-w-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Crown className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Upgrade untuk PDF
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Export PDF tersedia untuk paket berbayar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Tutup modal upgrade"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowUpgradeModal(false);
                  downloadFile("pdf", { skipUpgradeModal: true });
                }}
                className="h-12"
              >
                Download dengan Watermark
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  window.location.href = "/dashboard?upgrade=1";
                }}
                className="h-12"
              >
                Lihat Paket
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
