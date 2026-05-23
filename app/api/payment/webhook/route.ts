import { NextResponse } from "next/server";
import {
  PLAN_DETAILS,
  verifySignature,
  type MidtransNotification,
  type PaidPlan,
} from "@/lib/midtrans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SUCCESS_STATUSES = new Set(["settlement", "capture"]);
const PASSIVE_FAILURE_STATUSES = new Set(["deny", "cancel", "expire"]);

function isPaidPlan(value: unknown): value is PaidPlan {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PLAN_DETAILS, value)
  );
}

function getPeriodEnd() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

async function findUserIdByOrderId(orderId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("midtrans_order_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("Payment webhook lookup error:", error);
    return null;
  }

  return typeof data?.user_id === "string" ? data.user_id : null;
}

async function activateSubscription(params: {
  userId: string;
  orderId: string;
  plan: PaidPlan;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: params.userId,
      plan: params.plan,
      status: "ACTIVE",
      current_period_end: getPeriodEnd(),
      transaction_count_this_month: 0,
      midtrans_order_id: params.orderId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Payment webhook subscription update error:", error);
  }
}

export async function POST(request: Request) {
  try {
    const notification = (await request.json().catch(() => null)) as
      | MidtransNotification
      | null;

    if (!notification) {
      console.error("Payment webhook received invalid JSON.");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!verifySignature(notification)) {
      console.error("Payment webhook signature_key tidak valid.", {
        orderId: notification.order_id,
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const transactionStatus = String(notification.transaction_status ?? "");
    const orderId = String(notification.order_id ?? "");

    if (SUCCESS_STATUSES.has(transactionStatus)) {
      const plan = notification.custom_field1;
      const userId =
        typeof notification.custom_field2 === "string"
          ? notification.custom_field2
          : await findUserIdByOrderId(orderId);

      if (isPaidPlan(plan) && userId && orderId) {
        await activateSubscription({ userId, orderId, plan });
      } else {
        console.error("Payment webhook missing user or plan context.", {
          orderId,
          plan,
          userId,
        });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (PASSIVE_FAILURE_STATUSES.has(transactionStatus)) {
      console.info("Payment webhook passive failure status.", {
        orderId,
        transactionStatus,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Payment webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
