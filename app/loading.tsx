export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 sm:p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-52 rounded-xl bg-slate-200" />
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="h-52 rounded-2xl bg-slate-200" />
        <div className="h-52 rounded-2xl bg-slate-200" />
      </div>
      <p className="mt-4 text-sm text-slate-600">Menyiapkan dashboard Rekapin.id...</p>
    </main>
  );
}

