"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Coins,
  ExternalLink,
  Package,
  Plus,
  ScanLine,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/components/auth-provider";
import {
  formatCurrency,
  formatDateTime,
  formatShortDay,
  formatWeight,
} from "@/lib/format";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi<Stats>("/admin/stats");

  const symbol = data?.settings.currencySymbol ?? "₱";

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Kumusta, ${user?.name.split(" ")[0] ?? "there"}!`}
        description={
          data
            ? `${user?.storeName || data.settings.storeName} · Overview of your store's products and scans.`
            : "Overview of your store's products and scans."
        }
        actions={
          <>
            <Link href="/">
              <Button variant="secondary" size="md">
                <ExternalLink className="h-4 w-4" />
                Open scanner
              </Button>
            </Link>
            <Link href="/admin/products?new=1">
              <Button size="md">
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </Link>
          </>
        }
      />

      {error ? (
        <Card className="mb-5 border-danger/20 bg-danger-soft/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-danger">
              {error.message || "Could not load dashboard data."}
            </p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-20" />
                <Skeleton className="mt-3 h-3 w-32" />
              </Card>
            ))
          : [
              {
                label: "Total products",
                value: data.products.total.toLocaleString("en-PH"),
                hint: `${data.products.active} active · ${data.products.inactive} inactive`,
                icon: Package,
                tone: "bg-brand-soft text-brand",
              },
              {
                label: "Scans today",
                value: data.scans.today.toLocaleString("en-PH"),
                hint: `${data.scans.last7Days.toLocaleString("en-PH")} in the last 7 days`,
                icon: ScanLine,
                tone: "bg-[#eaf1fb] text-[#25558f]",
              },
              {
                label: "Low stock",
                value: data.products.lowStock.toLocaleString("en-PH"),
                hint: `At or below ${data.settings.lowStockThreshold} units`,
                icon: AlertTriangle,
                tone:
                  data.products.lowStock > 0
                    ? "bg-accent-soft text-[#8a5b00]"
                    : "bg-brand-soft text-brand",
              },
              {
                label: "Inventory value",
                value: formatCurrency(data.inventory.value, symbol),
                hint: `${data.products.active} active product${data.products.active === 1 ? "" : "s"}`,
                icon: Coins,
                tone: "bg-[#f2edfb] text-[#6b4c9a]",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold tracking-wide text-muted">
                      {stat.label}
                    </p>
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        stat.tone,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="price-tabular mt-2 text-3xl font-bold text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">{stat.hint}</p>
                </Card>
              );
            })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Scan activity</h2>
              <p className="mt-0.5 text-xs text-muted">
                Barcode lookups over the last 7 days
              </p>
            </div>
            <Badge tone="green">
              <TrendingUp className="h-3 w-3" />
              {data?.scans.last7Days ?? 0} scans
            </Badge>
          </div>

          {loading || !data ? (
            <Skeleton className="mt-6 h-44 w-full" />
          ) : (
            <div className="mt-6 flex h-44 items-end gap-2 sm:gap-4">
              {data.scans.perDay.map((day) => {
                const max = Math.max(
                  1,
                  ...data.scans.perDay.map((entry) => entry.count),
                );
                const height = Math.max(6, (day.count / max) * 100);
                return (
                  <div
                    key={day.date}
                    className="group flex flex-1 flex-col items-center gap-2"
                  >
                    <span className="text-[10px] font-semibold text-muted opacity-0 transition group-hover:opacity-100">
                      {day.count}
                    </span>
                    <div className="relative flex h-32 w-full items-end overflow-hidden rounded-lg bg-paper">
                      <div
                        className={cn(
                          "w-full rounded-lg transition-all duration-500",
                          day.count > 0
                            ? "bg-gradient-to-t from-brand to-[#3fa482]"
                            : "bg-line/70",
                        )}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted">
                      {formatShortDay(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Top scanned</h2>
              <p className="mt-0.5 text-xs text-muted">Last 30 days</p>
            </div>
            <Link
              href="/admin/scans"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"
            >
              History
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading || !data ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : data.topProducts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <ScanLine className="h-8 w-8 text-line" />
              <p className="mt-3 text-sm font-semibold text-ink-soft">
                No scans yet
              </p>
              <p className="mt-1 text-xs text-muted">
                Scan a barcode to see products here.
              </p>
            </div>
          ) : (
            <ol className="mt-4 divide-y divide-line">
              {data.topProducts.map((product, index) => (
                <li
                  key={product.barcode}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-paper text-[11px] font-bold text-brand">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {product.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted">
                      {product.barcode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-dark">
                      {formatCurrency(product.price, symbol)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {product.scans} scan{product.scans === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Recent scans</h2>
            <p className="mt-0.5 text-xs text-muted">
              Latest barcode lookups from the scanner
            </p>
          </div>
          <Link href="/admin/scans">
            <Button variant="ghost" size="sm">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {loading || !data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : data.recentScans.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">
            No scans recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {data.recentScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {scan.productName ?? "Unknown product"}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted">
                    {scan.barcode}
                    {scan.weight
                      ? ` · ${formatWeight(scan.weight, scan.weightUnit)}`
                      : ""}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-ink">
                    {formatCurrency(scan.price, symbol)}
                  </p>
                  <p className="text-[11px] text-muted">
                    {formatDateTime(scan.createdAt)}
                  </p>
                </div>
                <div className="text-right sm:hidden">
                  <p className="text-[11px] text-muted">
                    {formatDateTime(scan.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
