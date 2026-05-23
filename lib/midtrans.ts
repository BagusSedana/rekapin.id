import crypto from "node:crypto";
import midtransClient from "midtrans-client";
import { getRequiredEnv } from "@/lib/env";

export type PaidPlan = "STARTER" | "PRO" | "ADMIN";

export const PLAN_DETAILS: Record<
  PaidPlan,
  { label: string; price: number; description: string }
> = {
  STARTER: {
    label: "Starter",
    price: 29000,
    description: "Cocok untuk UMKM yang mulai rutin rekap transaksi.",
  },
  PRO: {
    label: "Pro",
    price: 99000,
    description: "Untuk bisnis aktif dengan volume transaksi lebih tinggi.",
  },
  ADMIN: {
    label: "Admin",
    price: 199000,
    description: "Untuk tim yang butuh pengelolaan operasional lebih lengkap.",
  },
};

export type CreateTransactionParams = {
  orderId: string;
  plan: PaidPlan;
  customerEmail?: string | null;
  customerName?: string | null;
  userId: string;
};

export type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  custom_field1?: string;
  custom_field2?: string;
  [key: string]: unknown;
};

export type MidtransOrderStatus = {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  status_code?: string;
  gross_amount?: string;
  [key: string]: unknown;
};

function isProduction() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true";
}

function getStatusBaseUrl() {
  return isProduction()
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";
}

function getServerKey() {
  return getRequiredEnv("MIDTRANS_SERVER_KEY");
}

function getClientKey() {
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? process.env.MIDTRANS_CLIENT_KEY;
}

function getSnapClient() {
  return new midtransClient.Snap({
    isProduction: isProduction(),
    serverKey: getServerKey(),
    clientKey: getClientKey(),
  });
}

export async function createTransaction(params: CreateTransactionParams) {
  const plan = PLAN_DETAILS[params.plan];
  const snap = getSnapClient();

  return snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: plan.price,
    },
    item_details: [
      {
        id: `rekapin-${params.plan.toLowerCase()}`,
        name: `Rekapin.id ${plan.label} - 30 hari`,
        quantity: 1,
        price: plan.price,
      },
    ],
    customer_details: {
      email: params.customerEmail ?? undefined,
      first_name: params.customerName ?? undefined,
    },
    custom_field1: params.plan,
    custom_field2: params.userId,
  });
}

export function verifySignature(notification: MidtransNotification) {
  const { order_id, status_code, gross_amount, signature_key } = notification;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  const rawSignature = `${order_id}${status_code}${gross_amount}${getServerKey()}`;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(rawSignature)
    .digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature_key, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function getOrderStatus(orderId: string): Promise<MidtransOrderStatus> {
  const authToken = Buffer.from(`${getServerKey()}:`).toString("base64");
  const response = await fetch(
    `${getStatusBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`,
    {
      headers: {
        Authorization: `Basic ${authToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | MidtransOrderStatus
    | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.status_message === "string"
        ? payload.status_message
        : "Gagal mengambil status order Midtrans."
    );
  }

  return payload ?? {};
}
