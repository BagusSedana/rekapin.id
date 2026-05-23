import midtransClient from "midtrans-client";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLAN_PRICE = 99000;

export async function POST() {
  try {
    if (!process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json(
        { message: "MIDTRANS_SERVER_KEY belum diatur." },
        { status: 500 }
      );
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Kamu perlu login dulu sebelum melakukan pembayaran." },
        { status: 401 }
      );
    }

    const snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    });

    const orderId = `REKAPIN-${Date.now()}-${user.id.slice(0, 8)}`;
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: PLAN_PRICE,
      },
      item_details: [
        {
          id: "rekapin-pro",
          name: "Rekapin Pro Bulanan",
          quantity: 1,
          price: PLAN_PRICE,
        },
      ],
      customer_details: {
        email: user.email ?? "tanpa-email@rekapin.id",
      },
    });

    return NextResponse.json(
      {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Midtrans Snap route error:", error);
    return NextResponse.json(
      { message: "Gagal membuat transaksi Midtrans. Coba lagi sebentar." },
      { status: 500 }
    );
  }
}
