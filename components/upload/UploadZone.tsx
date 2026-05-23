"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProcessingStatus } from "./ProcessingStatus";
import type { ExtractResult } from "@/lib/extract";

type UploadZoneProps = {
  onComplete: (results: ExtractResult[]) => void;
  businessId: string;
  disabled?: boolean;
};

type UploadPhase = "idle" | "selected" | "processing" | "done";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  error: string | null;
};

type CurrentProgress = {
  current: number;
  total: number;
  filename: string;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ONE_FILE_ERROR = "Gambar ini tidak bisa dibaca — coba foto yang lebih jelas";
const SIZE_ERROR = "File terlalu besar. Maksimal 5MB per gambar.";

const emptyExtractData: ExtractResult["data"] = {
  tanggal: null,
  nama_customer: null,
  nominal: null,
  metode_bayar: null,
  catatan: null,
  confidence: 0,
};

function createId(file: File) {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${file.name}-${file.size}-${file.lastModified}-${randomId}`;
}

function createFailedResult(error: string): ExtractResult {
  return {
    success: false,
    data: emptyExtractData,
    rawText: "",
    error,
  };
}

function getValidationMessage(fileRejections: FileRejection[]) {
  const hasSizeError = fileRejections.some((rejection) =>
    rejection.errors.some((error) => error.code === "file-too-large")
  );

  if (hasSizeError) return SIZE_ERROR;

  return "Format file belum didukung. Gunakan JPG, JPEG, PNG, atau WEBP.";
}

async function parseExtractResponse(response: Response): Promise<ExtractResult> {
  const payload = (await response.json().catch(() => null)) as ExtractResult | null;

  if (!payload) {
    return createFailedResult(ONE_FILE_ERROR);
  }

  if (!response.ok || !payload.success) {
    return createFailedResult(payload.error ?? ONE_FILE_ERROR);
  }

  return payload;
}

export function UploadZone({
  onComplete,
  businessId,
  disabled = false,
}: UploadZoneProps) {
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CurrentProgress | null>(null);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setValidationError(null);

    setSelectedImages((currentImages) => {
      const remainingSlots = MAX_FILES - currentImages.length;

      if (remainingSlots <= 0) {
        setValidationError("Maksimal 10 gambar sekali proses.");
        return currentImages;
      }

      const imagesToAdd = files.slice(0, remainingSlots).map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.push(previewUrl);

        return {
          id: createId(file),
          file,
          previewUrl,
          error: null,
        };
      });

      if (files.length > remainingSlots) {
        setValidationError("Maksimal 10 gambar sekali proses.");
      }

      setPhase("selected");
      return [...currentImages, ...imagesToAdd];
    });
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        setValidationError(getValidationMessage(fileRejections));
      }

      if (acceptedFiles.length > 0) {
        addFiles(acceptedFiles);
      }
    },
    [addFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    disabled: disabled || phase === "processing",
    maxFiles: MAX_FILES,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: true,
    noClick: true,
    onDrop,
  });

  const removeImage = (id: string) => {
    setSelectedImages((currentImages) => {
      const image = currentImages.find((item) => item.id === id);

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (previewUrl) => previewUrl !== image.previewUrl
        );
      }

      const nextImages = currentImages.filter((item) => item.id !== id);
      setPhase(nextImages.length > 0 ? "selected" : "idle");
      return nextImages;
    });
  };

  const processImages = async () => {
    if (selectedImages.length === 0 || phase === "processing") return;

    setPhase("processing");
    setValidationError(null);

    const results: ExtractResult[] = [];

    for (let index = 0; index < selectedImages.length; index += 1) {
      const image = selectedImages[index];

      setProgress({
        current: index + 1,
        total: selectedImages.length,
        filename: image.file.name,
      });

      try {
        const formData = new FormData();
        formData.append("file", image.file);
        formData.append("businessId", businessId);

        const response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });
        const result = await parseExtractResponse(response);

        if (!result.success) {
          setSelectedImages((currentImages) =>
            currentImages.map((item) =>
              item.id === image.id ? { ...item, error: ONE_FILE_ERROR } : item
            )
          );
        }

        results.push(result);
      } catch {
        setSelectedImages((currentImages) =>
          currentImages.map((item) =>
            item.id === image.id ? { ...item, error: ONE_FILE_ERROR } : item
          )
        );
        results.push(createFailedResult(ONE_FILE_ERROR));
      }
    }

    setProgress(null);
    setPhase("done");
    onComplete(results);
  };

  const hasSelectedImages = selectedImages.length > 0;
  const isProcessing = phase === "processing";

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition",
          "min-h-48 flex flex-col items-center justify-center",
          isDragActive ? "border-solid border-emerald-500 bg-emerald-50" : "",
          disabled || isProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <p className="mt-3 text-base font-semibold text-slate-900">
          Seret foto ke sini, atau ketuk untuk pilih
        </p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          Mendukung foto mutasi, bukti transfer, screenshot WA • Maks 5MB per foto
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={open}
          disabled={disabled || isProcessing}
          className="mt-5 h-12 w-full max-w-xs"
        >
          Pilih Gambar
        </Button>
      </div>

      {validationError ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {validationError}
        </p>
      ) : null}

      {hasSelectedImages ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {selectedImages.map((image) => (
            <div key={image.id} className="space-y-2">
              <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={image.previewUrl}
                  alt={image.file.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  disabled={isProcessing}
                  aria-label={`Hapus ${image.file.name}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-lg leading-none text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ×
                </button>
              </div>
              {image.error ? (
                <p className="max-w-24 text-xs leading-4 text-rose-700">{image.error}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {progress ? (
        <ProcessingStatus
          current={progress.current}
          total={progress.total}
          filename={progress.filename}
        />
      ) : null}

      {hasSelectedImages ? (
        <Button
          type="button"
          onClick={processImages}
          isLoading={isProcessing}
          disabled={disabled || isProcessing}
          className="h-12 w-full"
        >
          {phase === "done"
            ? "Proses Selesai"
            : `Proses ${selectedImages.length} Gambar`}
        </Button>
      ) : null}
    </div>
  );
}

