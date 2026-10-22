"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, RefreshCw, Save, X } from "lucide-react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { Alert, Button, Field, Spinner, inputClass } from "@/components/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { sellingUnitLabels, weightUnitLabels } from "@/lib/format";
import type {
  Product,
  SellingUnit,
  WeightUnit,
} from "@/lib/types";

type FormValues = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  sellingUnit: SellingUnit;
  weight: string;
  weightUnit: WeightUnit;
  price: string;
  stock: string;
  imageUrl: string;
  isActive: boolean;
};

function initialValues(
  product?: Product | null,
  initialBarcode?: string,
): FormValues {
  return {
    barcode: product?.barcode ?? initialBarcode ?? "",
    name: product?.name ?? "",
    brand: product?.brand ?? "",
    category: product?.category ?? "",
    description: product?.description ?? "",
    sellingUnit: product?.sellingUnit ?? "PIECE",
    weight: product?.weight !== null && product?.weight !== undefined
      ? String(product.weight)
      : "0",
    weightUnit: product?.weightUnit ?? "GRAM",
    price: product?.price !== null && product?.price !== undefined
      ? String(product.price)
      : "",
    stock: product?.stock !== null && product?.stock !== undefined
      ? String(product.stock)
      : "0",
    imageUrl: product?.imageUrl ?? "",
    isActive: product?.isActive ?? true,
  };
}

const SELLING_UNITS = Object.keys(sellingUnitLabels) as SellingUnit[];
const WEIGHT_UNITS = Object.keys(weightUnitLabels) as WeightUnit[];

function cameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera permission in your browser settings, or type the barcode manually.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Type the barcode manually instead.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return "Could not start the camera. Type the barcode manually or try again.";
  }
}

export function ProductForm({
  product,
  initialBarcode,
  autoScan = false,
  onSaved,
  onCancel,
}: {
  product?: Product | null;
  initialBarcode?: string;
  autoScan?: boolean;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() =>
    initialValues(product, initialBarcode),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef<(barcode: string) => void>(() => undefined);
  const [scanOpen, setScanOpen] = useState(autoScan);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [scanState, setScanState] = useState<"starting" | "on" | "error">(
    "starting",
  );
  const [scanError, setScanError] = useState<string | null>(null);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    detectedRef.current = (barcode) => {
      setValues((current) => ({ ...current, barcode }));
      setFieldErrors((current) => {
        if (!current.barcode) return current;
        const next = { ...current };
        delete next.barcode;
        return next;
      });
      window.setTimeout(() => {
        document.getElementById("name")?.focus();
      }, 50);
    };
  });

  useEffect(() => {
    if (!scanOpen) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    setScanState("starting");
    setScanError(null);

    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 800,
    });

    void (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          video,
          (result) => {
            if (!result || cancelled) return;
            const barcode = result.getText().trim();
            if (!barcode) return;
            detectedRef.current(barcode);
            try {
              navigator.vibrate?.(55);
            } catch {
              // Vibration is optional.
            }
            setScanOpen(false);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setScanState("on");
      } catch (err) {
        if (cancelled) return;
        console.error("[product-form] camera failed", err);
        setScanError(cameraErrorMessage(err));
        setScanState("error");
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      video.srcObject = null;
    };
  }, [scanOpen, scanAttempt]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      barcode: values.barcode.trim(),
      name: values.name.trim(),
      brand: values.brand.trim() || undefined,
      category: values.category.trim() || undefined,
      description: values.description.trim() || undefined,
      sellingUnit: values.sellingUnit,
      weight: Number(values.weight || 0),
      weightUnit: values.weightUnit,
      price: Number(values.price || 0),
      stock: Number(values.stock || 0),
      imageUrl: values.imageUrl.trim() || undefined,
      isActive: values.isActive,
    };

    try {
      if (product) {
        await apiFetch<Product>(`/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onSaved("Product updated successfully.");
      } else {
        await apiFetch<Product>("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onSaved("Product added to the catalog.");
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        if (err.details) {
          setFieldErrors(
            Object.fromEntries(
              err.details.map((detail) => [detail.field, detail.message]),
            ),
          );
        }
      } else {
        setError("Could not save the product. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Barcode"
          htmlFor="barcode"
          error={fieldErrors.barcode}
          hint="Scan or type it — required"
        >
          <div className="flex gap-2">
            <input
              id="barcode"
              required
              inputMode="numeric"
              autoComplete="off"
              value={values.barcode}
              onChange={(event) => update("barcode", event.target.value)}
              placeholder="4800016644933"
              className={`${inputClass} font-mono tracking-wide`}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                if (scanOpen) {
                  setScanOpen(false);
                } else {
                  setScanAttempt((value) => value + 1);
                  setScanOpen(true);
                }
              }}
              title={scanOpen ? "Close barcode scanner" : "Scan barcode"}
            >
              {scanOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {scanOpen ? "Close" : "Scan"}
              </span>
            </Button>
          </div>

          {scanOpen ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-line bg-[#06140e]">
              <div className="relative aspect-[16/9]">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                {scanState === "on" ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                    <div className="relative h-full max-h-32 w-full max-w-xs">
                      <span className="absolute top-0 left-0 h-6 w-6 rounded-tl-lg border-t-2 border-l-2 border-accent" />
                      <span className="absolute top-0 right-0 h-6 w-6 rounded-tr-lg border-t-2 border-r-2 border-accent" />
                      <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-accent" />
                      <span className="absolute right-0 bottom-0 h-6 w-6 rounded-br-lg border-r-2 border-b-2 border-accent" />
                      <span className="absolute inset-x-0 top-0 h-0.5 animate-scan-line bg-accent/80" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#06140e]/85 px-4 text-center">
                    {scanState === "starting" ? (
                      <>
                        <Spinner className="h-5 w-5 text-accent" />
                        <p className="mt-2 text-xs font-semibold text-white">
                          Starting the camera…
                        </p>
                        <p className="mt-1 text-[11px] text-white/50">
                          Allow camera access when your browser asks.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="max-w-xs text-xs leading-relaxed text-[#ffb4a8]">
                          {scanError}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-3"
                          onClick={() => setScanAttempt((value) => value + 1)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Try again
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <p className="text-[11px] text-white/60">
                  Point the camera at the barcode.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setScanOpen(false)}
                >
                  <X className="h-4 w-4" />
                  Stop
                </Button>
              </div>
            </div>
          ) : null}
        </Field>

        <Field
          label="Product name"
          htmlFor="name"
          error={fieldErrors.name}
          hint="Required"
        >
          <input
            id="name"
            required
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Lucky Me Pancit Canton"
            className={inputClass}
          />
        </Field>

        <Field label="Brand" htmlFor="brand" error={fieldErrors.brand}>
          <input
            id="brand"
            value={values.brand}
            onChange={(event) => update("brand", event.target.value)}
            placeholder="Lucky Me"
            className={inputClass}
          />
        </Field>

        <Field label="Category" htmlFor="category" error={fieldErrors.category}>
          <input
            id="category"
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
            placeholder="Noodles"
            className={inputClass}
          />
        </Field>

        <Field label="Selling unit" htmlFor="sellingUnit">
          <select
            id="sellingUnit"
            value={values.sellingUnit}
            onChange={(event) =>
              update("sellingUnit", event.target.value as SellingUnit)
            }
            className={inputClass}
          >
            {SELLING_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {sellingUnitLabels[unit]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <label className="flex h-[42px] cursor-pointer items-center justify-between rounded-xl border border-line bg-surface px-3.5">
            <span className="text-sm text-ink-soft">
              {values.isActive ? "Active — visible to scanner" : "Inactive — hidden"}
            </span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => update("isActive", event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand" />
              <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
          </label>
        </Field>

        <Field label="Net weight" htmlFor="weight" error={fieldErrors.weight}>
          <div className="flex gap-2">
            <input
              id="weight"
              type="number"
              min="0"
              step="0.001"
              value={values.weight}
              onChange={(event) => update("weight", event.target.value)}
              className={`${inputClass} flex-1`}
            />
            <select
              aria-label="Weight unit"
              value={values.weightUnit}
              onChange={(event) =>
                update("weightUnit", event.target.value as WeightUnit)
              }
              className={`${inputClass} w-36`}
            >
              {WEIGHT_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {weightUnitLabels[unit]}
                </option>
              ))}
            </select>
          </div>
        </Field>

        <Field
          label="Selling price"
          htmlFor="price"
          error={fieldErrors.price}
          hint="Required"
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-semibold text-muted">
              ₱
            </span>
            <input
              id="price"
              required
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              onChange={(event) => update("price", event.target.value)}
              placeholder="0.00"
              className={`${inputClass} pl-8`}
            />
          </div>
        </Field>

        <Field label="Stock on hand" htmlFor="stock" error={fieldErrors.stock}>
          <input
            id="stock"
            type="number"
            min="0"
            step="0.001"
            value={values.stock}
            onChange={(event) => update("stock", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Image URL"
          htmlFor="imageUrl"
          error={fieldErrors.imageUrl}
          hint="Optional"
        >
          <input
            id="imageUrl"
            type="url"
            value={values.imageUrl}
            onChange={(event) => update("imageUrl", event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        error={fieldErrors.description}
        hint="Optional"
      >
        <textarea
          id="description"
          rows={3}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Notes about this product…"
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : product ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
