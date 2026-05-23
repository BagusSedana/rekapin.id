import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrCreateDefaultBusiness(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; nama: string }> {
  const { data: existingBusiness, error: selectError } = await supabase
    .from("businesses")
    .select("id,nama")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error("Gagal mengambil data bisnis.");
  }

  if (existingBusiness) {
    return {
      id: String(existingBusiness.id),
      nama: String(existingBusiness.nama ?? "Bisnis Saya"),
    };
  }

  const { data: insertedBusiness, error: insertError } = await supabase
    .from("businesses")
    .insert({
      user_id: userId,
      nama: "Bisnis Saya",
    })
    .select("id,nama")
    .single();

  if (insertError || !insertedBusiness) {
    throw new Error("Gagal membuat profil bisnis default.");
  }

  return {
    id: String(insertedBusiness.id),
    nama: String(insertedBusiness.nama ?? "Bisnis Saya"),
  };
}

export async function getOwnedBusinessOrDefault(
  supabase: SupabaseClient,
  userId: string,
  businessId: FormDataEntryValue | string | null | undefined
): Promise<{ id: string; nama: string }> {
  const requestedBusinessId =
    typeof businessId === "string" && businessId.trim().length > 0
      ? businessId.trim()
      : null;

  if (requestedBusinessId) {
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id,nama")
      .eq("id", requestedBusinessId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error("Gagal memeriksa bisnis.");
    }

    if (!business) {
      throw new Error("Bisnis tidak ditemukan atau bukan milik akun ini.");
    }

    return {
      id: String(business.id),
      nama: String(business.nama ?? "Bisnis Saya"),
    };
  }

  return getOrCreateDefaultBusiness(supabase, userId);
}
