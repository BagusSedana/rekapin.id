import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "@/lib/types";

export async function fetchTransactionsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 250
): Promise<{ data: Transaction[]; error: string | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,user_id,business_id,tanggal,nama_customer,nominal,metode_bayar,status,catatan,created_at,updated_at"
    )
    .eq("user_id", userId)
    .order("tanggal", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as Transaction[], error: null };
}
