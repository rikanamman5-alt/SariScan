"use client";

import Link from "next/link";
import {
  ExternalLink,
  ScanLine,
  Search,
  Smartphone,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { useApi, useDebouncedValue } from "@/lib/hooks";
import {
  formatCurrency,
  formatDateTime,
  formatWeight,
} from "@/lib/format";
import type { AppSettings, ScanRecord } from "@/lib/types";
import { cn } from "@/lib/cn";

type Period = "all" | "today" | "7d" | "30d";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

function periodStart(period: Period) {
  if (period === "all") return null;

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (period === "7d") start.setUTCDate(start.getUTCDate() - 6);
  if (period === "30d") start.setUTCDate(start.getUTCDate() - 29);

  return start.toISOString();
}

export default function ScansPage() {
  const [barcode, setBarcode] = useState("");
  const debouncedBarcode = useDebouncedValue(barcode);
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const settings = useApi<AppSettings>("/admin/settings");
  const symbol = settings.data?.currencySymbol ?? "₱";

  const query = new URLSearchParams({
    page: String(page),
    limit: "15",
  });
  if (debouncedBarcode.trim()) query.set("barcode", debouncedBarcode.trim());

  if (from) query.set("from", from);

  const { data, pagination, loading, error, reload } = useApi<ScanRecord[]>(
    `/admin/scans?${query.toString()}`,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Activity"
        title="Scan history"
        description="Every barcode lookup, whether it matched a product or not. Useful for spotting missing items."
        actions={
          <Link href="/">
            <Button variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Open scanner
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
            <input
              value={barcode}
              onChange={(event) => {
                setBarcode(event.target.value);
                setPage(1);
              }}
              placeholder="Filter by barcode…"
              className={`${inputClass} pl-10 font-mono`}
              aria-label="Filter by barcode"
            />
          </div>
          <select
            value={period}
            onChange={(event) => {
              const next = event.target.value as Period;
              setPeriod(next);
              setFrom(periodStart(next));
              setPage(1);
            }}
            className={`${inputClass} sm:w-44`}
            aria-label="Filter by period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <Alert tone="error" title="Could not load scan history">
              {error.message}
            </Alert>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={<ScanLine className="h-6 w-6" />}
            title="No scans yet"
            description={
              debouncedBarcode
                ? "No scans match this barcode."
                : "Scans will appear here as soon as someone looks up a product."
            }
            action={
              <Link href="/">
                <Button>
                  <ScanLine className="h-4 w-4" />
                  Start scanning
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Scanned by</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((scan) => (
                  <tr
                    key={scan.id}
                    className="transition hover:bg-paper/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            scan.productId
                              ? "bg-brand-soft text-brand"
                              : "bg-accent-soft text-[#8a5b00]",
                          )}
                        >
                          <ScanLine className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {scan.productName ?? "Unknown product"}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted">
                            {scan.barcode}
                          </p>
                        </div>
                        {!scan.productId ? (
                          <Badge tone="amber">Not in catalog</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-soft">
                      {formatWeight(scan.weight, scan.weightUnit)}
                    </td>
                    <td className="price-tabular px-4 py-3.5 text-right text-sm font-bold text-ink">
                      {formatCurrency(scan.price, symbol)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                        {scan.source === "APP" ? (
                          <Smartphone className="h-3.5 w-3.5" />
                        ) : (
                          <Globe className="h-3.5 w-3.5" />
                        )}
                        {scan.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-soft">
                      {scan.user ? (
                        <span>
                          <span className="block font-semibold">
                            {scan.user.name}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {scan.user.email}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted">Guest</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-muted">
                      {formatDateTime(scan.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && data && data.length > 0 ? (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
