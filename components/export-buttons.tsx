"use client";

import { useState } from "react";

type ExportType = "excel" | "pdf";

export function ExportButtons() {
  const [loadingType, setLoadingType] = useState<ExportType | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const handleDownload = async (type: ExportType) => {
    setLoadingType(type);
    setFeedback("");

    try {
      const response = await fetch(`/api/export/${type}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(errorPayload?.message ?? "Gagal mengekspor data.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const ext = type === "excel" ? "xlsx" : "pdf";

      link.href = objectUrl;
      link.download = `rekap-transaksi-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kendala saat export.";
      setFeedback(errorMessage);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => handleDownload("excel")}
        disabled={loadingType !== null}
        className="h-12 w-full rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingType === "excel" ? "Menyiapkan file Excel..." : "Export ke Excel"}
      </button>

      <button
        type="button"
        onClick={() => handleDownload("pdf")}
        disabled={loadingType !== null}
        className="h-12 w-full rounded-xl bg-white px-4 text-base font-semibold text-slate-900 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingType === "pdf" ? "Menyiapkan file PDF..." : "Export ke PDF"}
      </button>

      {feedback ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

