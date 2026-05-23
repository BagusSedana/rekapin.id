"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/actions/types";
import { getOwnedBusinessOrDefault } from "@/lib/business";
import { extractFromImage } from "@/lib/extract";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBayar } from "@/lib/types";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const RECEIPT_BUCKET = "payment-proofs";
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function sanitizeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

function normalizeTransferDate(rawDate: string | null | undefined): string | null {
  if (!rawDate) return null;

  const value = rawDate.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(value);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const rawYear = dmyMatch[3];
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export async function uploadReceiptAndExtractAction(
  formData: FormData
): Promise<ActionResult<{ insertedCount: number }>> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data.user) {
      return {
        success: false,
        message: "Kamu perlu login dulu sebelum upload bukti bayar.",
      };
    }

    const file = formData.get("receipt");

    if (!(file instanceof File) || file.size === 0) {
      return {
        success: false,
        message: "File bukti bayar belum dipilih.",
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        message: "Format file belum didukung. Gunakan JPG, PNG, atau WEBP.",
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: "Ukuran file terlalu besar. Maksimal 8MB per upload.",
      };
    }

    const admin = createSupabaseAdminClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const storagePath = `${data.user.id}/${Date.now()}-${sanitizeFileName(
      file.name
    )}`;

    const { error: uploadError } = await admin.storage
      .from(RECEIPT_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return {
        success: false,
        message:
          "Upload gagal. Pastikan bucket storage sudah dibuat dengan nama payment-proofs.",
      };
    }

    const extractedTransaction = await extractFromImage(
      Buffer.from(bytes).toString("base64"),
      file.type
    );

    if (!extractedTransaction.success) {
      return {
        success: false,
        message:
          extractedTransaction.error ??
          "AI belum menemukan transaksi dari gambar ini. Coba foto yang lebih jelas.",
      };
    }

    const { data: extractedData } = extractedTransaction;

    if (
      !extractedData.tanggal ||
      !extractedData.nominal ||
      !extractedData.metode_bayar
    ) {
      return {
        success: false,
        message:
          "Data berhasil dibaca sebagian, tapi tanggal, nominal, atau metode bayar belum lengkap.",
      };
    }

    const business = await getOwnedBusinessOrDefault(
      supabase,
      data.user.id,
      formData.get("businessId")
    );
    const row = {
      user_id: data.user.id,
      business_id: business.id,
      tanggal: normalizeTransferDate(extractedData.tanggal),
      nama_customer: extractedData.nama_customer,
      nominal: extractedData.nominal,
      metode_bayar: extractedData.metode_bayar,
      catatan: extractedData.catatan,
      status: StatusBayar.BELUM_LUNAS,
      source_image_url: storagePath,
      ai_confidence: extractedData.confidence,
    };

    const { error: insertError } = await admin.from("transactions").insert(row);

    if (insertError) {
      console.error("Supabase insert extracted transactions error:", insertError);
      return {
        success: false,
        message: "Data berhasil dibaca, tapi gagal disimpan ke database.",
      };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "1 transaksi berhasil ditambahkan dari bukti bayar.",
      data: { insertedCount: 1 },
    };
  } catch (error) {
    console.error("uploadReceiptAndExtractAction error:", error);
    return {
      success: false,
      message: "Terjadi kendala saat memproses bukti bayar.",
    };
  }
}
