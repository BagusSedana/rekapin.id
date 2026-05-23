import { NextResponse } from "next/server";
import { extractFromImage } from "@/lib/extract";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function normalizeMimeType(mimeType: string): string {
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "File bukti bayar belum dikirim. Gunakan field bernama file.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "File kosong. Pilih gambar bukti bayar yang valid.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran file terlalu besar. Maksimal 5MB per gambar.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format file belum didukung. Gunakan JPG, PNG, atau WEBP.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const result = await extractFromImage(imageBase64, normalizeMimeType(file.type));

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error("Extract API error:", error);

    return NextResponse.json(
      {
        success: false,
        data: {
          tanggal: null,
          nama_customer: null,
          nominal: null,
          metode_bayar: null,
          catatan: null,
          confidence: 0,
        },
        rawText: "",
        error: "Terjadi kendala saat memproses gambar. Coba lagi sebentar.",
      },
      { status: 500 }
    );
  }
}

