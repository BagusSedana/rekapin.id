"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Format email belum valid.");

export async function kirimMagicLinkAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const parsedEmail = emailSchema.safeParse(formData.get("email"));

    if (!parsedEmail.success) {
      return {
        success: false,
        message:
          parsedEmail.error.issues[0]?.message ?? "Email belum valid. Coba lagi.",
      };
    }

    const supabase = createSupabaseServerClient();
    const origin =
      headers().get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email: parsedEmail.data,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return {
        success: false,
        message: "Gagal kirim link masuk. Pastikan email kamu benar lalu coba lagi.",
      };
    }

    return {
      success: true,
      message:
        "Link masuk berhasil dikirim. Silakan cek email (termasuk folder spam).",
    };
  } catch (error) {
    console.error("kirimMagicLinkAction error:", error);
    return {
      success: false,
      message: "Terjadi kendala saat mengirim email login.",
    };
  }
}

export async function keluarAction(): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("keluarAction signOut error:", error);
    }
  } catch (error) {
    console.error("keluarAction error:", error);
  }

  redirect("/");
}

