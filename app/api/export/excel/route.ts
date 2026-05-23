import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { formatTanggal } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchTransactionsForUser } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    const { data: transactions, error } = await fetchTransactionsForUser(
      supabase,
      user.id,
      1000
    );

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil data transaksi untuk export." },
        { status: 500 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Pembayaran");

    worksheet.columns = [
      { header: "Tanggal", key: "tanggal", width: 18 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Metode", key: "method", width: 18 },
      { header: "Nominal", key: "nominal", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Catatan", key: "catatan", width: 30 },
    ];

    worksheet.getRow(1).font = { bold: true };

    transactions.forEach((trx) => {
      worksheet.addRow({
        tanggal: formatTanggal(trx.tanggal),
        customer: trx.nama_customer ?? "-",
        method: trx.metode_bayar,
        nominal: trx.nominal,
        status:
          trx.status === "LUNAS"
            ? "Lunas"
            : trx.status === "SEBAGIAN"
              ? "Sebagian"
              : "Belum Lunas",
        catatan: trx.catatan ?? "-",
      });
    });

    worksheet.getColumn("nominal").numFmt = '"Rp" #,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    const body = new Uint8Array(buffer as ArrayBuffer);
    const fileName = `rekap-transaksi-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Export Excel error:", error);
    return NextResponse.json(
      { message: "Terjadi kendala saat export Excel." },
      { status: 500 }
    );
  }
}
