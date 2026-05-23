import { NextResponse } from "next/server";
import { z } from "zod";
import { generateExcel, generatePDF } from "@/lib/export";
import { formatTanggal } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

const exportRequestSchema = z.object({
  type: z.enum(["excel", "pdf"]),
  businessId: z.string().uuid("ID bisnis tidak valid."),
  period: z.string().min(1, "Periode wajib dipilih."),
  customRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseCustomDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Rentang tanggal custom tidak valid.");
  }

  return parsed;
}

function resolvePeriod(period: string, customRange?: { start: string; end: string }) {
  const today = new Date();

  if (period === "today") {
    const start = startOfDay(today);
    return {
      label: "Hari Ini",
      startDate: formatDateInput(start),
      endDate: formatDateInput(endOfDay(today)),
    };
  }

  if (period === "week") {
    const start = startOfDay(today);
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);

    return {
      label: "Minggu Ini",
      startDate: formatDateInput(start),
      endDate: formatDateInput(endOfDay(today)),
    };
  }

  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      label: getMonthLabel(today),
      startDate: formatDateInput(start),
      endDate: formatDateInput(endOfDay(today)),
    };
  }

  if (period === "last_month") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      label: getMonthLabel(lastMonth),
      startDate: formatDateInput(lastMonth),
      endDate: formatDateInput(end),
    };
  }

  if (period === "custom" && customRange) {
    const start = parseCustomDate(customRange.start);
    const end = parseCustomDate(customRange.end);
    const normalizedStart = start <= end ? start : end;
    const normalizedEnd = start <= end ? end : start;

    return {
      label: `${formatTanggal(normalizedStart)} - ${formatTanggal(normalizedEnd)}`,
      startDate: formatDateInput(normalizedStart),
      endDate: formatDateInput(normalizedEnd),
    };
  }

  return {
    label: period,
    startDate: null,
    endDate: null,
  };
}

function getOwnerName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return metadataName ?? user.email ?? "Pemilik Bisnis";
}

export async function POST(request: Request) {
  try {
    const payload = exportRequestSchema.parse(await request.json());
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Kamu perlu login dulu sebelum export." },
        { status: 401 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id,nama,user_id")
      .eq("id", payload.businessId)
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { message: "Bisnis tidak ditemukan atau bukan milik akun ini." },
        { status: 404 }
      );
    }

    const resolvedPeriod = resolvePeriod(payload.period, payload.customRange);
    let query = supabase
      .from("transactions")
      .select(
        "id,user_id,business_id,tanggal,nama_customer,nominal,metode_bayar,status,catatan,created_at,updated_at"
      )
      .eq("business_id", payload.businessId)
      .eq("user_id", user.id)
      .order("tanggal", { ascending: true })
      .order("created_at", { ascending: true });

    if (resolvedPeriod.startDate) {
      query = query.gte("tanggal", resolvedPeriod.startDate);
    }

    if (resolvedPeriod.endDate) {
      query = query.lte("tanggal", resolvedPeriod.endDate);
    }

    const { data: transactions, error: transactionsError } = await query;

    if (transactionsError) {
      return NextResponse.json(
        { message: "Gagal mengambil data transaksi untuk export." },
        { status: 500 }
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPaidUser =
      subscription?.status === "ACTIVE" && subscription.plan !== "FREE";
    const exportParams = {
      transactions: (transactions ?? []) as Transaction[],
      businessName: business.nama,
      period: resolvedPeriod.label,
      ownerName: getOwnerName(user),
    };
    const generatedFile =
      payload.type === "pdf"
        ? generatePDF({ ...exportParams, isPaidUser })
        : await generateExcel(exportParams);
    const responseBody = new ArrayBuffer(generatedFile.buffer.byteLength);
    new Uint8Array(responseBody).set(generatedFile.buffer);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": generatedFile.mimeType,
        "Content-Disposition": `attachment; filename="${generatedFile.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kendala saat membuat file export.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
