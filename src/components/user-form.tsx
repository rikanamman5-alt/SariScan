"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Save, ShieldCheck } from "lucide-react";
import { Alert, Button, Field, Spinner, inputClass } from "@/components/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { roleLabels } from "@/lib/format";
import type { Role, User } from "@/lib/types";

type FormValues = {
  name: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
};

export function UserForm({
  user,
  currentUserId,
  onSaved,
  onCancel,
}: {
  user?: User | null;
  currentUserId: string;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const isSelf = Boolean(user && user.id === currentUserId);
  const [values, setValues] = useState<FormValues>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "STAFF",
    isActive: user?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      if (user) {
        const payload: Record<string, unknown> = {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
        };
        if (!isSelf) {
          payload.role = values.role;
          payload.isActive = values.isActive;
        }
        if (values.password) payload.password = values.password;

        await apiFetch<User>(`/admin/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onSaved("User account updated.");
      } else {
        await apiFetch<User>("/admin/users", {
          method: "POST",
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password,
            role: values.role,
            isActive: values.isActive,
          }),
        });
        onSaved("User account created.");
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
        setError("Could not save this user. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {isSelf ? (
        <Alert tone="info">
          You are editing your own account. Role and status can only be changed
          by another Super Admin.
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="user-name" error={fieldErrors.name}>
          <input
            id="user-name"
            required
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Email address" htmlFor="user-email" error={fieldErrors.email}>
          <input
            id="user-email"
            type="email"
            required
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label={user ? "New password" : "Password"}
          htmlFor="user-password"
          error={fieldErrors.password}
          hint={user ? "Leave blank to keep current" : "At least 8 characters"}
        >
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
            <input
              id="user-password"
              type="password"
              required={!user}
              minLength={8}
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder={user ? "••••••••" : "Create a password"}
              className={`${inputClass} pl-10`}
              autoComplete="new-password"
            />
          </div>
        </Field>

        <Field label="Role" htmlFor="user-role">
          <select
            id="user-role"
            value={values.role}
            disabled={isSelf}
            onChange={(event) =>
              update("role", event.target.value as Role)
            }
            className={inputClass}
          >
            {(["STAFF", "ADMIN", "SUPER_ADMIN"] as Role[]).map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <span className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
          <span>
            <span className="block text-sm font-semibold text-ink">
              Account is active
            </span>
            <span className="block text-xs text-muted">
              Inactive users cannot sign in or use the API.
            </span>
          </span>
        </span>
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={values.isActive}
            disabled={isSelf}
            onChange={(event) => update("isActive", event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-5 w-9 rounded-full bg-line transition peer-checked:bg-brand peer-disabled:opacity-50" />
          <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
        </span>
      </label>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
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
          {saving ? "Saving…" : user ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
