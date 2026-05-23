import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";
import { formatRupiah, formatTanggal } from "@/lib/format";
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

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(14);
    doc.text("Rekap Pembayaran Rekapin.id", 40, 40);
    doc.setFontSize(10);
    doc.text(`Tanggal export: ${formatTanggal(new Date())}`, 40, 58);

    autoTable(doc, {
      startY: 76,
      head: [["Tanggal", "Customer", "Metode", "Nominal", "Status"]],
      body: transactions.map((trx) => [
        formatTanggal(trx.tanggal),
        trx.nama_customer ?? "-",
        trx.metode_bayar,
        formatRupiah(trx.nominal),
        trx.status === "LUNAS"
          ? "Lunas"
          : trx.status === "SEBAGIAN"
            ? "Sebagian"
            : "Belum Lunas",
      ]),
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fillColor: [36, 95, 79],
      },
    });

    const pdfArrayBuffer = doc.output("arraybuffer");
    const body = new Uint8Array(pdfArrayBuffer);
    const fileName = `rekap-transaksi-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Export PDF error:", error);
    return NextResponse.json(
      { message: "Terjadi kendala saat export PDF." },
      { status: 500 }
    );
  }
}
