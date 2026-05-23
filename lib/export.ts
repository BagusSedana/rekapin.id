import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah, formatTanggal } from "@/lib/utils";
import { StatusBayar, type Transaction } from "@/lib/types";

export type ExportParams = {
  transactions: Transaction[];
  businessName: string;
  period: string;
  ownerName: string;
};

export type PDFExportParams = ExportParams & {
  isPaidUser?: boolean;
};

export type GeneratedExportFile = {
  buffer: Uint8Array;
  fileName: string;
  mimeType: string;
};

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PDF_MIME_TYPE = "application/pdf";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFileName(businessName: string, period: string, extension: string) {
  const businessSlug = slugify(businessName) || "bisnis";
  const periodSlug = slugify(period) || new Date().toISOString().slice(0, 10);

  return `laporan-${businessSlug}-${periodSlug}.${extension}`;
}

function getTotals(transactions: Transaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      totals.totalSemua += transaction.nominal;

      if (transaction.status === StatusBayar.LUNAS) {
        totals.totalLunas += transaction.nominal;
      }

      if (transaction.status === StatusBayar.BELUM_LUNAS) {
        totals.totalPiutang += transaction.nominal;
      }

      return totals;
    },
    {
      totalLunas: 0,
      totalPiutang: 0,
      totalSemua: 0,
    }
  );
}

function getStatusColor(status: StatusBayar) {
  if (status === StatusBayar.LUNAS) return { argb: "FF047857" };
  if (status === StatusBayar.BELUM_LUNAS) return { argb: "FFBE123C" };
  return { argb: "FFC2410C" };
}

function applyThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;

    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value;
      const text =
        value === null || value === undefined
          ? ""
          : typeof value === "object" && "richText" in value
            ? value.richText.map((part) => part.text).join("")
            : String(value);

      maxLength = Math.max(maxLength, text.length + 2);
    });

    column.width = Math.min(Math.max(maxLength, 12), 36);
  });
}

export async function generateExcel(
  params: ExportParams
): Promise<GeneratedExportFile> {
  const { transactions, businessName, period, ownerName } = params;
  const totals = getTotals(transactions);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Transaksi");

  workbook.creator = ownerName;
  workbook.created = new Date();
  workbook.modified = new Date();

  worksheet.columns = [
    { key: "no" },
    { key: "tanggal" },
    { key: "nama_customer" },
    { key: "nominal" },
    { key: "metode_bayar" },
    { key: "status" },
    { key: "catatan" },
  ];
  worksheet.views = [{ state: "frozen", ySplit: 4 }];

  worksheet.mergeCells("A1:G1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `LAPORAN TRANSAKSI - ${businessName.toUpperCase()}`;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  worksheet.getCell("A2").value = `Periode: ${period}`;
  worksheet.getCell("D2").value = `Dicetak: ${formatTanggal(new Date())}`;
  worksheet.getCell("F2").value = `Pemilik: ${ownerName}`;
  worksheet.getRow(2).font = { size: 11 };

  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    "No",
    "Tanggal",
    "Nama Customer",
    "Nominal",
    "Metode Bayar",
    "Status",
    "Catatan",
  ];
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  headerRow.eachCell((cell) => applyThinBorder(cell));

  transactions.forEach((transaction, index) => {
    const row = worksheet.addRow({
      no: index + 1,
      tanggal: formatTanggal(transaction.tanggal),
      nama_customer: transaction.nama_customer ?? "-",
      nominal: transaction.nominal,
      metode_bayar: transaction.metode_bayar,
      status: transaction.status,
      catatan: transaction.catatan ?? "-",
    });

    row.getCell(4).numFmt = '"Rp" #,##0';
    row.getCell(6).font = {
      bold: true,
      color: getStatusColor(transaction.status),
    };
    row.eachCell((cell) => applyThinBorder(cell));
  });

  const lastDataRow = Math.max(worksheet.lastRow?.number ?? 4, 4);
  const totalLunasRow = worksheet.getRow(lastDataRow + 2);
  const totalPiutangRow = worksheet.getRow(lastDataRow + 3);
  const totalSemuaRow = worksheet.getRow(lastDataRow + 4);

  totalLunasRow.getCell(1).value = `TOTAL LUNAS: ${formatRupiah(totals.totalLunas)}`;
  totalPiutangRow.getCell(1).value = `TOTAL PIUTANG: ${formatRupiah(
    totals.totalPiutang
  )}`;
  totalSemuaRow.getCell(1).value = `TOTAL SEMUA: ${formatRupiah(totals.totalSemua)}`;

  [totalLunasRow, totalPiutangRow, totalSemuaRow].forEach((row) => {
    row.font = { bold: true };
    worksheet.mergeCells(row.number, 1, row.number, 7);
  });

  autoFitColumns(worksheet);

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: new Uint8Array(buffer as ArrayBuffer),
    fileName: buildFileName(businessName, period, "xlsx"),
    mimeType: EXCEL_MIME_TYPE,
  };
}

function addFreeWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.saveGraphicsState();
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(42);
    doc.text("REKAPIN.ID", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: -35,
    });
    doc.restoreGraphicsState();
  }
}

function addPageNumbers(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Halaman ${page} dari ${pageCount}`, pageWidth - 14, pageHeight - 10, {
      align: "right",
    });
  }
}

export function generatePDF(params: PDFExportParams): GeneratedExportFile {
  const {
    transactions,
    businessName,
    period,
    ownerName,
    isPaidUser = false,
  } = params;
  const totals = getTotals(transactions);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(businessName, 14, 16);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Periode: ${period}`, 14, 24);
  doc.text(`Dicetak: ${formatTanggal(new Date())}`, 14, 30);
  doc.text(`Pemilik: ${ownerName}`, 14, 36);

  autoTable(doc, {
    startY: 44,
    head: [["No", "Tanggal", "Nama Customer", "Nominal", "Metode Bayar", "Status", "Catatan"]],
    body: transactions.map((transaction, index) => [
      index + 1,
      formatTanggal(transaction.tanggal),
      transaction.nama_customer ?? "-",
      formatRupiah(transaction.nominal),
      transaction.metode_bayar,
      transaction.status,
      transaction.catatan ?? "-",
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 28 },
      3: { halign: "right" },
      6: { cellWidth: 68 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const status = String(data.cell.raw);

        if (status === StatusBayar.LUNAS) data.cell.styles.textColor = [4, 120, 87];
        if (status === StatusBayar.BELUM_LUNAS) {
          data.cell.styles.textColor = [190, 18, 60];
        }
        if (status === StatusBayar.SEBAGIAN) {
          data.cell.styles.textColor = [194, 65, 12];
        }
      }
    },
  });

  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 44;
  const footerY = Math.min(finalY + 12, doc.internal.pageSize.getHeight() - 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Pemasukan: ${formatRupiah(totals.totalLunas)}`, 14, footerY);
  doc.text(`Total Piutang: ${formatRupiah(totals.totalPiutang)}`, 14, footerY + 6);
  doc.text(`Total Semua: ${formatRupiah(totals.totalSemua)}`, 14, footerY + 12);

  if (!isPaidUser) {
    addFreeWatermark(doc);
  }

  addPageNumbers(doc);

  return {
    buffer: new Uint8Array(doc.output("arraybuffer")),
    fileName: buildFileName(businessName, period, "pdf"),
    mimeType: PDF_MIME_TYPE,
  };
}

