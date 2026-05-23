"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadReceiptAndExtractAction } from "@/app/actions/upload";

type UploadReceiptFormProps = {
  businessId?: string;
};

export function UploadReceiptForm({ businessId }: UploadReceiptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>("");
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await uploadReceiptAndExtractAction(formData);
      setFeedback(result.message);

      if (result.success) {
        event.currentTarget.reset();
        setSelectedFileName("");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {businessId ? <input type="hidden" name="businessId" value={businessId} /> : null}

      <label className="block text-sm font-medium text-slate-700">
        Upload bukti transfer (JPG/PNG/WEBP, maks 8MB)
      </label>
      <input
        type="file"
        name="receipt"
        required
        accept="image/jpeg,image/png,image/webp"
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setSelectedFileName(file?.name ?? "");
        }}
      />

      {selectedFileName ? (
        <p className="text-xs text-slate-600">File dipilih: {selectedFileName}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-12 w-full rounded-xl bg-slate-900 px-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Memproses bukti bayar..." : "Upload & Ekstrak Transaksi"}
      </button>

      {feedback ? (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}
    </form>
  );
}
