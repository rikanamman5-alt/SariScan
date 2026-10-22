"use client";

import Link from "next/link";
import { Save, Store, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordCard } from "@/components/change-password-card";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Skeleton,
  Spinner,
  inputClass,
} from "@/components/ui";
import { useApi } from "@/lib/hooks";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { AppSettings } from "@/lib/types";

type SettingsForm = {
  currency: string;
  currencySymbol: string;
  lowStockThreshold: string;
  scanSourceLabel: string;
  scanEnabled: boolean;
};

export default function SettingsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "SUPER_ADMIN";

  const { data, loading, error, reload } = useApi<AppSettings>(
    "/admin/settings",
  );

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Scanner behaviour, store preferences and your account security."
        actions={
          canEdit ? (
            <Badge tone="green">Super Admin controls</Badge>
          ) : (
            <Badge tone="neutral">Read-only</Badge>
          )
        }
      />

      {loading ? (
        <Card className="p-5">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      ) : error ? (
        <Card className="p-5">
          <Alert tone="error" title="Could not load settings">
            {error.message}
          </Alert>
          <Button variant="secondary" className="mt-3" onClick={reload}>
            Try again
          </Button>
        </Card>
      ) : data ? (
        <SettingsContent
          settings={data}
          canEdit={canEdit}
          email={user?.email ?? ""}
        />
      ) : null}
    </div>
  );
}

function SettingsContent({
  settings,
  canEdit,
  email,
}: {
  settings: AppSettings;
  canEdit: boolean;
  email: string;
}) {
  const [form, setForm] = useState<SettingsForm>({
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    lowStockThreshold: String(settings.lowStockThreshold),
    scanSourceLabel: settings.scanSourceLabel,
    scanEnabled: settings.scanEnabled,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function update<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setSaveError(null);
    setNotice(null);

    try {
      await apiFetch<AppSettings>("/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          currency: form.currency.trim().toUpperCase(),
          currencySymbol: form.currencySymbol.trim(),
          lowStockThreshold: Number(form.lowStockThreshold || 0),
          scanSourceLabel: form.scanSourceLabel.trim(),
          scanEnabled: form.scanEnabled,
        }),
      });
      setNotice("Store settings saved.");
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : "Could not save settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={saveSettings} className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-ink">Store preferences</h2>
              <p className="text-xs text-muted">
                Currency and stock rules for your workspace.
              </p>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 animate-fade-in">
              <Alert tone="success">{notice}</Alert>
            </div>
          ) : null}

          {saveError ? (
            <div className="mt-4">
              <Alert tone="error">{saveError}</Alert>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Currency code" htmlFor="currency" hint="e.g. PHP">
              <input
                id="currency"
                value={form.currency}
                disabled={!canEdit}
                onChange={(event) => update("currency", event.target.value)}
                className={`${inputClass} uppercase`}
              />
            </Field>

            <Field label="Currency symbol" htmlFor="currencySymbol">
              <input
                id="currencySymbol"
                value={form.currencySymbol}
                disabled={!canEdit}
                onChange={(event) =>
                  update("currencySymbol", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="Low stock threshold"
              htmlFor="lowStockThreshold"
              hint="Units"
            >
              <input
                id="lowStockThreshold"
                type="number"
                min="0"
                value={form.lowStockThreshold}
                disabled={!canEdit}
                onChange={(event) =>
                  update("lowStockThreshold", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field
              label="Scan source label"
              htmlFor="scanSourceLabel"
              hint="Shown in history"
            >
              <input
                id="scanSourceLabel"
                value={form.scanSourceLabel}
                disabled={!canEdit}
                onChange={(event) =>
                  update("scanSourceLabel", event.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-4 rounded-xl border border-line bg-paper/60 px-4 py-3 text-xs leading-relaxed text-muted">
            Your public store name, contact number and address are managed in{" "}
            <Link
              href="/admin/profile"
              className="font-semibold text-brand hover:text-brand-dark"
            >
              My profile
            </Link>
            . They appear on your PDF inventory.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-bold text-ink">Scanner availability</h2>
          <p className="mt-0.5 text-xs text-muted">
            Temporarily turn off lookups for everyone without deleting data.
          </p>

          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-line bg-paper/60 px-4 py-3">
            <span className="flex items-start gap-3">
              <span
                className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                  form.scanEnabled ? "bg-brand" : "bg-danger"
                }`}
              />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {form.scanEnabled
                    ? "Scanning is enabled"
                    : "Scanning is disabled"}
                </span>
                <span className="block text-xs text-muted">
                  {form.scanEnabled
                    ? "Customers and staff can look up barcodes."
                    : "Every scan request will return a 503 error."}
                </span>
              </span>
            </span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                checked={form.scanEnabled}
                disabled={!canEdit}
                onChange={(event) =>
                  update("scanEnabled", event.target.checked)
                }
                className="peer sr-only"
              />
              <span className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand peer-disabled:opacity-50" />
              <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
          </label>

          {canEdit ? (
            <div className="mt-5 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner /> : <Save className="h-4 w-4" />}
                {saving ? "Saving…" : "Save settings"}
              </Button>
            </div>
          ) : (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-paper px-3.5 py-3 text-xs text-muted">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Only a Super Admin can change store settings.
            </p>
          )}
        </Card>
      </form>

      <div className="space-y-4">
        <ChangePasswordCard email={email} />

        <Card className="bg-brand-dark p-5 text-white">
          <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
            Deploying
          </p>
          <h2 className="mt-2 text-lg font-bold">Vercel-ready by design</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/60">
            This dashboard and the API deploy together. Set your Postgres
            connection string and auth secret, then run the database migration
            once.
          </p>
        </Card>
      </div>
    </div>
  );
}
