"use client";

import { UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  isLoading?: boolean;
};

export function UploadDropzone({
  file,
  onFileChange,
  isLoading = false,
}: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 8 * 1024 * 1024,
    disabled: isLoading,
    onDrop: (acceptedFiles) => {
      onFileChange(acceptedFiles[0] ?? null);
    },
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center transition",
          isDragActive ? "border-emerald-500 bg-emerald-50" : "hover:bg-slate-50",
          isLoading ? "cursor-not-allowed opacity-60" : ""
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-9 w-9 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-900">
          {file ? file.name : "Pilih atau tarik bukti pembayaran"}
        </p>
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP maksimal 8MB</p>
      </div>

      {file ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onFileChange(null)}
          disabled={isLoading}
          className="w-full"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Hapus File
        </Button>
      ) : null}
    </div>
  );
}

