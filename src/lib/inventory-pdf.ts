import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatWeight } from "@/lib/format";
import type { Product } from "@/lib/types";

type InventoryPdfInput = {
  storeName: string;
  ownerName?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  currency: string;
  products: Product[];
};

const BRAND: [number, number, number] = [14, 107, 79];
const MUTED: [number, number, number] = [102, 118, 109];

function money(value: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function downloadInventoryPdf({
  storeName,
  ownerName,
  contactNumber,
  address,
  currency,
  products,
}: InventoryPdfInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const totalValue = products.reduce(
    (sum, product) => sum + (product.price ?? 0) * (product.stock ?? 0),
    0,
  );
  const generatedAt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(storeName || "SariScan", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Product inventory", 14, 21);
  doc.text(`Generated: ${generatedAt}`, 196, 14, { align: "right" });
  doc.text(
    `${products.length} product${products.length === 1 ? "" : "s"}`,
    196,
    21,
    { align: "right" },
  );

  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  let headerY = 37;
  if (ownerName) {
    doc.text(`Owner: ${ownerName}`, 14, headerY);
    headerY += 5;
  }
  if (contactNumber) {
    doc.text(`Contact: ${contactNumber}`, 14, headerY);
    headerY += 5;
  }
  if (address) {
    const lines = doc.splitTextToSize(`Address: ${address}`, 150) as string[];
    doc.text(lines, 14, headerY);
    headerY += lines.length * 4.5;
  }

  autoTable(doc, {
    startY: headerY + 3,
    head: [["#", "Product", "Barcode", "Net weight", "Price", "Stock", "Value"]],
    body: products.map((product, index) => [
      String(index + 1),
      product.name,
      product.barcode,
      formatWeight(product.weight, product.weightUnit),
      money(product.price ?? 0, currency),
      String(product.stock ?? 0),
      money((product.price ?? 0) * (product.stock ?? 0), currency),
    ]),
    foot: [
      [
        "",
        "Total",
        "",
        "",
        "",
        "",
        money(totalValue, currency),
      ],
    ],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      overflow: "linebreak",
      textColor: [11, 31, 23],
      lineColor: [225, 232, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    footStyles: {
      fillColor: [232, 244, 238],
      textColor: [8, 69, 52],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [243, 246, 241],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "right" },
      1: { cellWidth: 62 },
      2: { cellWidth: 32, font: "courier" },
      3: { cellWidth: 26 },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `SariScan · ${storeName || "Store"} · Page ${page} of ${pageCount}`,
      105,
      290,
      { align: "center" },
    );
  }

  const safeStore =
    (storeName || "sariscan")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "sariscan";
  const date = new Date().toISOString().slice(0, 10);

  doc.save(`${safeStore}-inventory-${date}.pdf`);
}
