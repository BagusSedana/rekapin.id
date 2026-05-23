# Rekapin.id

SaaS tool rekap pembayaran untuk UMKM Indonesia.

User upload screenshot bukti transfer/mutasi, AI membaca data lalu mengubahnya jadi tabel transaksi yang rapi. Data bisa diedit, ditandai lunas/belum, dan diekspor ke Excel/PDF.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- Anthropic Claude Vision
- ExcelJS & jsPDF
- Midtrans Snap

## Jalankan Local

1. Install dependency

```bash
npm install
```

2. Buat file env

```bash
cp .env.example .env.local
```

3. Isi variabel di `.env.local`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `MIDTRANS_SERVER_KEY`

4. Jalankan migrasi SQL di Supabase:

- File: `supabase/migrations/20260523000000_init_schema.sql`

5. Jalankan dev server

```bash
npm run dev
```

## Struktur Penting

- `app/actions` - server actions (auth, upload, transaksi)
- `components` - semua komponen UI
- `app/api/export/*` - export Excel/PDF
- `app/api/payment/*` - create payment dan webhook Midtrans
- `lib/ai/anthropic.ts` - ekstraksi data dari gambar bukti bayar

## Catatan Integrasi

- Bucket storage Supabase yang dipakai: `payment-proofs`
- Status transaksi: `LUNAS`, `BELUM_LUNAS`, atau `SEBAGIAN`
- Format UI:
  - Mata uang: `Rp 1.500.000`
  - Tanggal: `DD MMM YYYY`
