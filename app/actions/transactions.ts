"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/types";
import { getOwnedBusinessOrDefault } from "@/lib/business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetodeBayar, StatusBayar, type Transaction } from "@/lib/types";

const createManualSchema = z.object({
  payerName: z.string().trim().min(2, "Nama pembayar terlalu pendek."),
  nominal: z.coerce.number().int().positive("Nominal wajib lebih dari Rp 0."),
  tanggal: z.string().trim().optional(),
  metodeBayar: z.enum([
    MetodeBayar.QRIS,
    MetodeBayar.TRANSFER,
    MetodeBayar.CASH,
    MetodeBayar.GOPAY,
    MetodeBayar.OVO,
    MetodeBayar.DANA,
    MetodeBayar.SHOPEE_PAY,
    MetodeBayar.LAINNYA,
  ]),
  status: z.enum([
    StatusBayar.LUNAS,
    StatusBayar.BELUM_LUNAS,
    StatusBayar.SEBAGIAN,
  ]),
  catatan: z.string().trim().max(300, "Catatan maksimal 300 karakter.").optional(),
});

const updateSchema = z.object({
  transactionId: z.string().uuid("ID transaksi tidak valid."),
  status: z.enum([
    StatusBayar.LUNAS,
    StatusBayar.BELUM_LUNAS,
    StatusBayar.SEBAGIAN,
  ]),
  catatan: z.string().trim().max(300, "Catatan maksimal 300 karakter.").optional(),
});

async function getAuthenticatedContext() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { supabase, user: null, message: "Sesi login habis. Silakan masuk lagi." };
  }

  return { supabase, user: data.user, message: null };
}

export async function createManualTransactionAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      return { success: false, message: auth.message ?? "Kamu belum login." };
    }

    const parsed = createManualSchema.safeParse({
      payerName: formData.get("payerName"),
      nominal: formData.get("nominal"),
      tanggal: formData.get("tanggal"),
      metodeBayar: formData.get("metodeBayar"),
      status: formData.get("status"),
      catatan: formData.get("catatan"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Data transaksi belum valid.",
      };
    }

    const business = await getOwnedBusinessOrDefault(
      auth.supabase,
      auth.user.id,
      formData.get("businessId")
    );
    const tanggal =
      parsed.data.tanggal && parsed.data.tanggal.length > 0
        ? parsed.data.tanggal
        : new Date().toISOString().slice(0, 10);

    const { error } = await auth.supabase.from("transactions").insert({
      user_id: auth.user.id,
      business_id: business.id,
      tanggal,
      nama_customer: parsed.data.payerName,
      nominal: parsed.data.nominal,
      metode_bayar: parsed.data.metodeBayar,
      catatan: parsed.data.catatan || null,
      status: parsed.data.status,
    });

    if (error) {
      return {
        success: false,
        message: "Gagal menyimpan transaksi manual. Coba beberapa saat lagi.",
      };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true, message: "Transaksi manual berhasil ditambahkan." };
  } catch (error) {
    console.error("createManualTransactionAction error:", error);
    return {
      success: false,
      message: "Terjadi kendala saat menambah transaksi manual.",
    };
  }
}

export async function updateTransactionAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      return { success: false, message: auth.message ?? "Kamu belum login." };
    }

    const parsed = updateSchema.safeParse({
      transactionId: formData.get("transactionId"),
      status: formData.get("status"),
      catatan: formData.get("catatan"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Perubahan transaksi tidak valid.",
      };
    }

    const { error } = await auth.supabase
      .from("transactions")
      .update({
        status: parsed.data.status,
        catatan: parsed.data.catatan || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.transactionId)
      .eq("user_id", auth.user.id);

    if (error) {
      return {
        success: false,
        message: "Gagal memperbarui transaksi. Coba lagi.",
      };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");
    return { success: true, message: "Transaksi berhasil diperbarui." };
  } catch (error) {
    console.error("updateTransactionAction error:", error);
    return {
      success: false,
      message: "Terjadi kendala saat menyimpan perubahan transaksi.",
    };
  }
}

const metodeBayarSchema = z.enum([
  MetodeBayar.QRIS,
  MetodeBayar.TRANSFER,
  MetodeBayar.CASH,
  MetodeBayar.GOPAY,
  MetodeBayar.OVO,
  MetodeBayar.DANA,
  MetodeBayar.SHOPEE_PAY,
  MetodeBayar.LAINNYA,
]);

const statusBayarSchema = z.enum([
  StatusBayar.LUNAS,
  StatusBayar.BELUM_LUNAS,
  StatusBayar.SEBAGIAN,
]);

const tanggalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.");

const transactionUpdateSchema = z
  .object({
    tanggal: tanggalSchema.optional(),
    nama_customer: z.string().trim().nullable().optional(),
    nominal: z.coerce.number().int().positive("Nominal wajib lebih dari Rp 0.").optional(),
    metode_bayar: metodeBayarSchema.optional(),
    status: statusBayarSchema.optional(),
    catatan: z.string().trim().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Tidak ada perubahan yang disimpan.",
  });

const transactionInsertSchema = z.object({
  business_id: z.string().uuid("ID bisnis tidak valid."),
  tanggal: tanggalSchema,
  nama_customer: z.string().trim().nullable().optional(),
  nominal: z.coerce.number().int().positive("Nominal wajib lebih dari Rp 0."),
  metode_bayar: metodeBayarSchema,
  status: statusBayarSchema.default(StatusBayar.BELUM_LUNAS),
  catatan: z.string().trim().nullable().optional(),
});

export type TransactionFilters = {
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
};

function normalizeNullableText(value: string | null | undefined) {
  if (value === null || value === undefined) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getMonthRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<void> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      throw new Error(auth.message ?? "Kamu belum login.");
    }

    const parsedId = z.string().uuid("ID transaksi tidak valid.").parse(id);
    const parsedUpdates = transactionUpdateSchema.parse(updates);
    const payload = {
      ...parsedUpdates,
      nama_customer: normalizeNullableText(parsedUpdates.nama_customer),
      catatan: normalizeNullableText(parsedUpdates.catatan),
      updated_at: new Date().toISOString(),
    };

    const { error } = await auth.supabase
      .from("transactions")
      .update(payload)
      .eq("id", parsedId)
      .eq("user_id", auth.user.id);

    if (error) {
      throw new Error("Gagal menyimpan perubahan transaksi.");
    }

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("updateTransaction error:", error);
    throw error instanceof Error
      ? error
      : new Error("Terjadi kendala saat menyimpan transaksi.");
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      throw new Error(auth.message ?? "Kamu belum login.");
    }

    const parsedId = z.string().uuid("ID transaksi tidak valid.").parse(id);
    const { error } = await auth.supabase
      .from("transactions")
      .delete()
      .eq("id", parsedId)
      .eq("user_id", auth.user.id);

    if (error) {
      throw new Error("Gagal menghapus transaksi.");
    }

    revalidatePath("/dashboard");
  } catch (error) {
    console.error("deleteTransaction error:", error);
    throw error instanceof Error
      ? error
      : new Error("Terjadi kendala saat menghapus transaksi.");
  }
}

export async function addTransaction(
  data: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">
): Promise<Transaction> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      throw new Error(auth.message ?? "Kamu belum login.");
    }

    const parsed = transactionInsertSchema.parse(data);
    const { data: insertedTransaction, error } = await auth.supabase
      .from("transactions")
      .insert({
        user_id: auth.user.id,
        business_id: parsed.business_id,
        tanggal: parsed.tanggal,
        nama_customer: normalizeNullableText(parsed.nama_customer),
        nominal: parsed.nominal,
        metode_bayar: parsed.metode_bayar,
        status: parsed.status,
        catatan: normalizeNullableText(parsed.catatan),
      })
      .select(
        "id,user_id,business_id,tanggal,nama_customer,nominal,metode_bayar,status,catatan,created_at,updated_at"
      )
      .single();

    if (error || !insertedTransaction) {
      throw new Error("Gagal menambah transaksi manual.");
    }

    revalidatePath("/dashboard");
    return insertedTransaction as Transaction;
  } catch (error) {
    console.error("addTransaction error:", error);
    throw error instanceof Error
      ? error
      : new Error("Terjadi kendala saat menambah transaksi.");
  }
}

export async function getTransactions(
  businessId: string,
  filters: TransactionFilters = {}
): Promise<Transaction[]> {
  try {
    const auth = await getAuthenticatedContext();

    if (!auth.user) {
      throw new Error(auth.message ?? "Kamu belum login.");
    }

    const parsedBusinessId = z
      .string()
      .uuid("ID bisnis tidak valid.")
      .parse(businessId);
    let query = auth.supabase
      .from("transactions")
      .select(
        "id,user_id,business_id,tanggal,nama_customer,nominal,metode_bayar,status,catatan,created_at,updated_at"
      )
      .eq("business_id", parsedBusinessId)
      .eq("user_id", auth.user.id)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.year && filters.month) {
      const { start, end } = getMonthRange(filters.year, filters.month);
      query = query.gte("tanggal", start).lt("tanggal", end);
    } else {
      if (filters.startDate) query = query.gte("tanggal", filters.startDate);
      if (filters.endDate) query = query.lte("tanggal", filters.endDate);
    }

    const search = filters.search?.trim();
    if (search) {
      query = query.ilike("nama_customer", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error("Gagal mengambil data transaksi.");
    }

    return (data ?? []) as Transaction[];
  } catch (error) {
    console.error("getTransactions error:", error);
    throw error instanceof Error
      ? error
      : new Error("Terjadi kendala saat mengambil transaksi.");
  }
}
