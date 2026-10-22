"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  FileDown,
  FileJson,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Pagination,
  Skeleton,
  Spinner,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { useApi, useDebouncedValue } from "@/lib/hooks";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import {
  formatCurrency,
  formatNumber,
  formatWeight,
  sellingUnitLabels,
} from "@/lib/format";
import type { AppSettings, Product } from "@/lib/types";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "active" | "inactive";

const SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
] as const;

export default function ProductsPage() {
  const { user } = useAuth();
  const canEdit = Boolean(user);
  const canImport = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const canManageAny = canImport;

  function canManageProduct(product: Product) {
    return canManageAny || product.createdBy?.id === user?.id;
  }

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<string>("createdAt-desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [initialBarcode, setInitialBarcode] = useState("");
  const [autoScan, setAutoScan] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  const settings = useApi<AppSettings>("/admin/settings");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setInitialBarcode("");
    setAutoScan(false);
    setFormOpen(true);
  }, []);

  const openScanToAdd = useCallback(() => {
    setEditing(null);
    setInitialBarcode("");
    setAutoScan(true);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (!canEdit) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;

    const barcode = params.get("barcode") ?? "";
    const shouldScan = params.get("scan") === "1";
    window.history.replaceState({}, "", "/admin/products");
    const timer = window.setTimeout(() => {
      setEditing(null);
      setInitialBarcode(barcode);
      setAutoScan(shouldScan);
      setFormOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canEdit]);

  const [sortField, sortOrder] = sort.split("-");
  const query = new URLSearchParams({
    page: String(page),
    limit: "10",
    sort: sortField,
    order: sortOrder,
  });
  if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
  if (status !== "all") query.set("isActive", status);

  const { data, pagination, loading, error, reload } = useApi<Product[]>(
    `/products?${query.toString()}`,
  );

  const symbol = settings.data?.currencySymbol ?? "₱";
  const lowStockThreshold = settings.data?.lowStockThreshold ?? 10;

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(`/products/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      showNotice(`“${deleteTarget.name}” was deleted.`);
      reload();
    } catch (err) {
      setDeleteError(
        err instanceof ApiClientError
          ? err.message
          : "Could not delete this product.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function submitImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImporting(true);
    setImportError(null);

    try {
      const parsed = JSON.parse(importText);
      const products = Array.isArray(parsed) ? parsed : parsed?.products;
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error("Provide a JSON array of products.");
      }

      const result = await apiFetch<{
        created: number;
        updated: number;
        total: number;
      }>("/products/import", {
        method: "POST",
        body: JSON.stringify({ mode: "upsert", products }),
      });

      setImportOpen(false);
      setImportText("");
      showNotice(
        `Import complete: ${result.created} created, ${result.updated} updated.`,
      );
      reload();
    } catch (err) {
      setImportError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Import failed. Check your JSON format.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function copyBarcode(barcode: string) {
    try {
      await navigator.clipboard.writeText(barcode);
      setCopiedBarcode(barcode);
      window.setTimeout(() => setCopiedBarcode(null), 1500);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Add products by scanning a barcode or typing them in. Every item is recorded and ready to export as a PDF."
        actions={
          canEdit ? (
            <>
              <Link href="/admin/products/pdf">
                <Button variant="secondary" size="md">
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              </Link>
              {canImport ? (
                <Button
                  variant="secondary"
                  onClick={() => setImportOpen(true)}
                  size="md"
                >
                  <FileJson className="h-4 w-4" />
                  Import
                </Button>
              ) : null}
              <Button variant="secondary" onClick={openScanToAdd} size="md">
                <ScanBarcode className="h-4 w-4" />
                Scan to add
              </Button>
              <Button onClick={openCreate} size="md">
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </>
          ) : (
            <Badge tone="neutral">Sign in to add products</Badge>
          )
        }
      />

      {notice ? (
        <div className="mb-4 animate-fade-in">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, barcode, brand or category…"
              className={`${inputClass} pl-10`}
              aria-label="Search products"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              className={`${inputClass} w-36`}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className={`${inputClass} w-44`}
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <Alert tone="error" title="Could not load products">
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
            title="No products found"
            description={
              search || status !== "all"
                ? "Try a different search or filter."
                : "Add your first product to start scanning barcodes."
            }
            action={
              canEdit ? (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add product
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Net weight</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  {canEdit ? <th className="px-5 py-3 text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((product) => {
                  const isLow =
                    product.stock !== null &&
                    product.stock <= lowStockThreshold &&
                    product.isActive;
                  const isOut = product.stock === 0;

                  return (
                    <tr
                      key={product.id}
                      className="group transition hover:bg-paper/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-xl border border-line object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-bold text-brand">
                              {product.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {product.name}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {product.brand ?? "No brand"}
                              {product.category
                                ? ` · ${product.category}`
                                : ""}
                              {` · per ${sellingUnitLabels[product.sellingUnit].toLowerCase()}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => copyBarcode(product.barcode)}
                          className="inline-flex items-center gap-1.5 rounded-md font-mono text-xs text-ink-soft transition hover:text-brand"
                          title="Copy barcode"
                        >
                          {product.barcode}
                          {copiedBarcode === product.barcode ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted/50" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-ink-soft">
                        {formatWeight(product.weight, product.weightUnit)}
                      </td>
                      <td className="price-tabular px-4 py-3.5 text-right text-sm font-bold text-ink">
                        {formatCurrency(product.price, symbol)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span
                          className={cn(
                            "price-tabular text-sm font-semibold",
                            isOut
                              ? "text-danger"
                              : isLow
                                ? "text-[#8a5b00]"
                                : "text-ink-soft",
                          )}
                        >
                          {formatNumber(product.stock)}
                        </span>
                        {isLow ? (
                          <span className="ml-1.5 inline-block align-middle">
                            <Badge tone={isOut ? "red" : "amber"}>
                              {isOut ? "Out" : "Low"}
                            </Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={product.isActive ? "green" : "neutral"}>
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      {canEdit ? (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {canManageProduct(product) ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setInitialBarcode("");
                                    setAutoScan(false);
                                    setEditing(product);
                                    setFormOpen(true);
                                  }}
                                  title="Edit product"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget(product);
                                  }}
                                  title="Delete product"
                                  className="text-muted hover:bg-danger-soft hover:text-danger"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium text-muted">
                                Added by {product.createdBy?.name ?? "another user"}
                              </span>
                            )}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
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

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setInitialBarcode("");
          setAutoScan(false);
        }}
        title={editing ? "Edit product" : "Add product"}
        description={
          editing
            ? "Update the product details. Changes apply to the next scan."
            : "Scan the barcode or type it in, then fill in the details."
        }
        size="lg"
      >
        <ProductForm
          product={editing}
          initialBarcode={initialBarcode}
          autoScan={autoScan}
          onCancel={() => {
            setFormOpen(false);
            setInitialBarcode("");
            setAutoScan(false);
          }}
          onSaved={(message) => {
            setFormOpen(false);
            setEditing(null);
            setInitialBarcode("");
            setAutoScan(false);
            showNotice(message);
            reload();
          }}
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete product?"
        description={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.barcode}) will be permanently removed. Scan history is kept for your records.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              {deleting ? "Deleting…" : "Delete product"}
            </Button>
          </>
        }
      >
        {deleteError ? <Alert tone="error">{deleteError}</Alert> : null}
        {!deleteError ? (
          <p className="text-sm leading-relaxed text-muted">
            This action cannot be undone. If you only want to hide the product
            from the scanner, edit it and switch the status to inactive
            instead.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import products"
        description="Paste a JSON array. Existing barcodes will be updated."
        size="lg"
      >
        <form onSubmit={submitImport} className="space-y-4">
          {importError ? <Alert tone="error">{importError}</Alert> : null}
          <Field
            label="Product JSON"
            hint="Max 500 items"
            htmlFor="import-json"
          >
            <textarea
              id="import-json"
              rows={12}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={`[
  {
    "barcode": "4800016644933",
    "name": "Lucky Me Pancit Canton",
    "price": 17,
    "weight": 60,
    "weightUnit": "GRAM"
  }
]`}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
          </Field>
          <div className="rounded-xl bg-paper px-3.5 py-3 text-xs leading-relaxed text-muted">
            Required fields: <span className="font-mono">barcode</span>,{" "}
            <span className="font-mono">name</span>,{" "}
            <span className="font-mono">price</span>. Optional: brand, category,
            description, weight, weightUnit, sellingUnit, stock, imageUrl,
            isActive.
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportOpen(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={importing || !importText.trim()}>
              {importing ? <Spinner /> : <FileJson className="h-4 w-4" />}
              {importing ? "Importing…" : "Import products"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
