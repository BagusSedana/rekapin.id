type ProcessingStatusProps = {
  current: number;
  total: number;
  filename: string;
};

export function ProcessingStatus({
  current,
  total,
  filename,
}: ProcessingStatusProps) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-900">
            Membaca gambar {current} dari {total}...
          </p>
          <p className="truncate text-xs text-emerald-800">{filename}</p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

