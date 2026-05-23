import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  MetodeBayar,
  StatusBayar,
  type ExtractedTransaction,
} from "@/lib/types";

const extractionSchema = z.object({
  transactions: z.array(
    z.object({
      tanggal: z.string().trim().optional().nullable(),
      nama_customer: z.string().trim().min(1),
      nominal: z.number().nonnegative(),
      metode_bayar: z.enum([
        MetodeBayar.QRIS,
        MetodeBayar.TRANSFER,
        MetodeBayar.CASH,
        MetodeBayar.GOPAY,
        MetodeBayar.OVO,
        MetodeBayar.DANA,
        MetodeBayar.SHOPEE_PAY,
        MetodeBayar.LAINNYA,
      ]),
      catatan: z.string().trim().optional().nullable(),
    })
  ),
});

function extractJsonObject(text: string): unknown {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Format respons AI tidak valid.");
  }

  const rawJson = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(rawJson);
}

export async function extractTransactionsFromImage(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ExtractedTransaction[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY belum diatur.");
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const mediaType =
    input.mimeType === "image/jpg" ? "image/jpeg" : input.mimeType;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0,
    system:
      "Kamu analis transaksi UMKM Indonesia. Ekstrak data transaksi secara akurat dan jangan mengarang data.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Baca gambar bukti transfer/mutasi ini dan ekstrak transaksi ke JSON.",
              "Balas HANYA JSON valid dengan format:",
              '{"transactions":[{"tanggal":"YYYY-MM-DD atau null","nama_customer":"","nominal":150000,"metode_bayar":"TRANSFER","catatan":""}]}',
              "Jika ada data tidak terbaca, isi null atau string kosong.",
              "nominal harus integer rupiah tanpa titik/desimal.",
            ].join(" "),
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: input.buffer.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  const textContent = response.content
    .filter((content) => content.type === "text")
    .map((content) => content.text)
    .join("\n");

  const parsedJson = extractJsonObject(textContent);
  const parsed = extractionSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new Error("Respons AI tidak sesuai format transaksi.");
  }

  return parsed.data.transactions.map((item) => ({
    tanggal: item.tanggal ?? null,
    nama_customer: item.nama_customer,
    nominal: Math.round(item.nominal),
    metode_bayar: item.metode_bayar,
    status: StatusBayar.BELUM_LUNAS,
    catatan: item.catatan ?? null,
  }));
}
