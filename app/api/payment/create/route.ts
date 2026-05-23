import { NextResponse } from "next/server";
import { z } from "zod";
import { createTransaction, PLAN_DETAILS } from "@/lib/midtrans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createPaymentSchema = z.object({
  plan: z.enum(["STARTER", "PRO", "ADMIN"]),
});

// Harga plan: STARTER 29000, PRO 99000, ADMIN 199000.
function createOrderId(userId: string) {
  const userPrefix = userId.replace(/-/g, "").slice(0, 6);
  return `rekp-${userPrefix}-${Date.now()}`;
}

async function savePendingOrder(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  orderId: string
) {
  const { data: subscription, error: selectError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error("Gagal memeriksa subscription.");
  }

  if (subscription) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        midtrans_order_id: orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      throw new Error("Gagal menyimpan order pembayaran.");
    }

    return;
  }

  const { error } = await supabase.from("subscriptions").insert({
    user_id: userId,
    plan: "FREE",
    status: "ACTIVE",
    midtrans_order_id: orderId,
  });

  if (error) {
    throw new Error("Gagal membuat subscription awal.");
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createPaymentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Plan tidak valid." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Kamu perlu login dulu sebelum upgrade." },
        { status: 401 }
      );
    }

    const orderId = createOrderId(user.id);
    const transaction = await createTransaction({
      orderId,
      plan: parsed.data.plan,
      customerEmail: user.email,
      customerName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
      userId: user.id,
    });

    await savePendingOrder(supabase, user.id, orderId);

    return NextResponse.json(
      {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        order_id: orderId,
        plan: parsed.data.plan,
        amount: PLAN_DETAILS[parsed.data.plan].price,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Payment create error:", error);
    return NextResponse.json(
      { message: "Gagal membuat transaksi Midtrans. Coba lagi sebentar." },
      { status: 500 }
    );
  }
}
