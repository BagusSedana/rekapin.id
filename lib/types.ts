export enum MetodeBayar {
  QRIS = "QRIS",
  TRANSFER = "TRANSFER",
  CASH = "CASH",
  GOPAY = "GOPAY",
  OVO = "OVO",
  DANA = "DANA",
  SHOPEE_PAY = "SHOPEE_PAY",
  LAINNYA = "LAINNYA",
}

export enum StatusBayar {
  LUNAS = "LUNAS",
  BELUM_LUNAS = "BELUM_LUNAS",
  SEBAGIAN = "SEBAGIAN",
}

export interface Transaction {
  id: string;
  user_id: string;
  business_id: string;
  tanggal: string;
  nama_customer: string | null;
  nominal: number;
  metode_bayar: MetodeBayar;
  status: StatusBayar;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  nama: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export interface ExtractedTransaction {
  tanggal: string | null;
  nama_customer: string;
  nominal: number;
  metode_bayar: MetodeBayar;
  status: StatusBayar;
  catatan: string | null;
}
