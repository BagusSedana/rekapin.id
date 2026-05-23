import { z } from "zod";
import { createAnthropicClient } from "@/lib/anthropic";

const EXTRACT_MODEL = "claude-claude-sonnet-4-20250514";

const METODE_BAYAR_VALUES = [
  "QRIS",
  "TRANSFER",
  "CASH",
  "GOPAY",
  "OVO",
  "DANA",
  "SHOPEE_PAY",
  "LAINNYA",
] as const;

const SYSTEM_PROMPT = `Kamu adalah sistem OCR keuangan yang membaca bukti transfer, screenshot mutasi bank, dan bukti pembayaran UMKM Indonesia.

Tugasmu HANYA mengekstrak data ini dari gambar:
1. tanggal transaksi (BUKAN tanggal cetak/download)
2. nama pengirim atau nama customer
3. nominal uang yang ditransfer/dibayar (angka saja, tanpa "Rp", tanpa titik/koma)
4. metode pembayaran
5. catatan/berita transfer jika ada

ATURAN PENTING:
- Jika tidak yakin, isi null. JANGAN menebak atau mengisi dengan nilai default.
- nominal HARUS berupa integer (angka bulat rupiah). Jika tertulis "Rp 150.000" maka nilai adalah 150000.
- tanggal HARUS format YYYY-MM-DD. Jika gambar menunjukkan "15 Jan 2025" maka nilai adalah "2025-01-15".
- metode_bayar dipilih dari: QRIS, TRANSFER, CASH, GOPAY, OVO, DANA, SHOPEE_PAY, LAINNYA
- confidence adalah seberapa yakin kamu (0-100). Jika gambar buram, nilai rendah.
- Selalu response dalam JSON valid, tidak ada teks lain di luar JSON.

Response format WAJIB:
{
  "tanggal": "2025-01-15" atau null,
  "nama_customer": "Budi Santoso" atau null,
  "nominal": 150000 atau null,
  "metode_bayar": "TRANSFER" atau null,
  "catatan": "pembayaran order #123" atau null,
  "confidence": 87,
  "raw_text": "semua teks yang kamu baca dari gambar"
}`;

export type ExtractResult = {
  success: boolean;
  data: {
    tanggal: string | null;
    nama_customer: string | null;
    nominal: number | null;
    metode_bayar: string | null;
    catatan: string | null;
    confidence: number;
  };
  rawText: string;
  error: string | null;
};

type ExtractPayload = {
  tanggal: string | null;
  nama_customer: string | null;
  nominal: number | null;
  metode_bayar: (typeof METODE_BAYAR_VALUES)[number] | null;
  catatan: string | null;
  confidence: number;
  raw_text: string;
};

const emptyResultData: ExtractResult["data"] = {
  tanggal: null,
  nama_customer: null,
  nominal: null,
  metode_bayar: null,
  catatan: null,
  confidence: 0,
};

const extractSchema = z.object({
  tanggal: z.string().nullable(),
  nama_customer: z.string().nullable(),
  nominal: z.number().int().positive().nullable(),
  metode_bayar: z.enum(METODE_BAYAR_VALUES).nullable(),
  catatan: z.string().nullable(),
  confidence: z.number().int().min(0).max(100),
  raw_text: z.string(),
});

function normalizeBase64(imageBase64: string): string {
  const trimmed = imageBase64.trim();
  const commaIndex = trimmed.indexOf(",");

  if (trimmed.startsWith("data:") && commaIndex !== -1) {
    return trimmed.slice(commaIndex + 1);
  }

  return trimmed;
}

function normalizeMimeType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" {
  if (mimeType === "image/jpg") return "image/jpeg";

  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  ) {
    return mimeType;
  }

  throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
}

function parseJsonResponse(text: string): unknown {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI belum mengembalikan JSON yang valid.");
  }

  return JSON.parse(text.slice(firstBrace, lastBrace + 1));
}

function isValidDateString(value: string | null): boolean {
  if (value === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validatePayload(payload: unknown): ExtractPayload {
  const parsed = extractSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Format data dari AI tidak sesuai.");
  }

  const data = {
    ...parsed.data,
    tanggal: normalizeNullableString(parsed.data.tanggal),
    nama_customer: normalizeNullableString(parsed.data.nama_customer),
    catatan: normalizeNullableString(parsed.data.catatan),
    raw_text: parsed.data.raw_text.trim(),
  };

  if (!isValidDateString(data.tanggal)) {
    throw new Error("Tanggal dari AI tidak valid.");
  }

  return data;
}

export async function extractFromImage(
  imageBase64: string,
  mimeType: string
): Promise<ExtractResult> {
  try {
    const normalizedMimeType = normalizeMimeType(mimeType);
    const normalizedBase64 = normalizeBase64(imageBase64);

    if (!normalizedBase64) {
      return {
        success: false,
        data: emptyResultData,
        rawText: "",
        error: "Gambar kosong atau tidak bisa dibaca.",
      };
    }

    const anthropic = createAnthropicClient();
    const response = await anthropic.messages.create({
      model: EXTRACT_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Baca gambar ini dan kembalikan JSON sesuai format wajib.",
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: normalizedMimeType,
                data: normalizedBase64,
              },
            },
          ],
        },
      ],
    });

    const aiText = response.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n")
      .trim();

    const payload = validatePayload(parseJsonResponse(aiText));

    return {
      success: true,
      data: {
        tanggal: payload.tanggal,
        nama_customer: payload.nama_customer,
        nominal: payload.nominal,
        metode_bayar: payload.metode_bayar,
        catatan: payload.catatan,
        confidence: payload.confidence,
      },
      rawText: payload.raw_text,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kendala saat membaca bukti pembayaran.";

    return {
      success: false,
      data: emptyResultData,
      rawText: "",
      error: message,
    };
  }
}

