"use client";

import Link from "next/link";
import { ArrowLeft, FileDown, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Alert, Button, Card, Skeleton } from "@/components/ui";
import { apiRequest, ApiClientError } from "@/lib/client-api";
import { downloadInventoryPdf } from "@/lib/inventory-pdf";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatWeight,
} from "@/lib/format";
import type { AppSettings, Product } from "@/lib/types";

export default function PdfInventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [settingsResult, firstPage] = await Promise.all([
          apiRequest<AppSettings>("/admin/settings"),
          apiRequest<Product[]>(
            "/products?page=1&limit=100&sort=name&order=asc&isActive=all",
          ),
        ]);

        const all = [...firstPage.data];
        let pagination = firstPage.meta?.pagination;
        let page = 1;

        while (pagination?.hasNextPage) {
          page += 1;
          const result = await apiRequest<Product[]>(
            `/products?page=${page}&limit=100&sort=name&order=asc&isActive=all`,
          );
          all.push(...result.data);
          pagination = result.meta?.pagination;
        }

        if (cancelled) return;
        setSettings(settingsResult.data);
        setProducts(all);
        setGeneratedAt(new Date().toISOString());
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Could not load the product list for the PDF.",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const symbol = settings?.currencySymbol ?? "₱";
  const currency = settings?.currency ?? "PHP";
  const storeName = user?.storeName || settings?.storeName || "SariScan";
  const totalItems = products?.length ?? 0;
  const totalValue =
    products?.reduce(
      (sum, product) => sum + (product.price ?? 0) * (product.stock ?? 0),
      0,
    ) ?? 0;

  function download() {
    if (!products) return;
    setDownloading(true);
    try {
      downloadInventoryPdf({
        storeName,
        ownerName: user?.name,
        contactNumber: user?.contactNumber,
        address: user?.address,
        currency,
        products,
      });
    } catch {
      setError("Could not create the PDF file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Download as PDF"
        description="Save your inventory as a PDF on your phone, then transfer it to a laptop or computer to print."
        actions={
          <>
            <Link href="/admin/products">
              <Button variant="secondary" size="md">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button
              onClick={download}
              size="md"
              disabled={!products || downloading}
            >
              <FileDown className="h-4 w-4" />
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4">
          <Alert tone="error" title="Could not prepare the PDF">
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          The PDF includes your store name, contact number, address, product
          list, prices, stock, and estimated total value. After downloading,
          open it on your laptop and print it there.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-brand uppercase">
              PDF preview
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">
              {storeName}
            </h2>
            <div className="mt-1 space-y-0.5 text-[11px] text-muted">
              {user?.name ? <p>Owner: {user.name}</p> : null}
              {user?.contactNumber ? (
                <p>Contact: {user.contactNumber}</p>
              ) : null}
              {user?.address ? <p>Address: {user.address}</p> : null}
              <p>
                {generatedAt
                  ? `Generated ${formatDate(generatedAt)}`
                  : "Preparing inventory…"}
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-ink">
              {formatNumber(totalItems)} product{totalItems === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-muted">
              Estimated value: {formatCurrency(totalValue, symbol)}
            </p>
            {!user?.storeName ||
            !user?.contactNumber ||
            !user?.address ? (
              <Link
                href="/admin/profile"
                className="mt-2 inline-block text-[11px] font-semibold text-brand hover:text-brand-dark"
              >
                Complete your store details →
              </Link>
            ) : null}
          </div>
        </div>

        {products === null && !error ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : null}

        {products && products.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No products have been recorded yet.
          </p>
        ) : null}

        {products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
                  <th className="px-4 py-2.5 text-right">#</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Barcode</th>
                  <th className="px-4 py-2.5">Net weight</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                  <th className="px-4 py-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product, index) => (
                  <tr key={product.id} className="align-top">
                    <td className="px-4 py-2.5 text-right text-muted">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-ink">{product.name}</p>
                      <p className="text-[10px] text-muted">
                        {[product.brand, product.category]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-ink-soft">
                      {product.barcode}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {formatWeight(product.weight, product.weightUnit)}
                    </td>
                    <td className="price-tabular px-4 py-2.5 text-right font-semibold text-ink">
                      {formatCurrency(product.price, symbol)}
                    </td>
                    <td className="price-tabular px-4 py-2.5 text-right text-ink-soft">
                      {formatNumber(product.stock)}
                    </td>
                    <td className="price-tabular px-4 py-2.5 text-right font-semibold text-ink">
                      {formatCurrency(
                        (product.price ?? 0) * (product.stock ?? 0),
                        symbol,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
