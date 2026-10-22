"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert, Button, Card, Field, Spinner, inputClass } from "@/components/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";

export function ChangePasswordCard({ email }: { email?: string }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setChanging(true);

    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Password changed. Other sessions were signed out.");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not change your password.",
      );
    } finally {
      setChanging(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-[#8a5b00]">
          <KeyRound className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-ink">Change your password</h2>
          <p className="text-xs text-muted">
            {email ? `Signing in as ${email}` : "Update your account password"}
          </p>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 animate-fade-in">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <Field label="Current password" htmlFor="currentPassword">
          <input
            id="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>
        <Field
          label="New password"
          htmlFor="newPassword"
          hint="At least 8 characters"
        >
          <input
            id="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            className={inputClass}
          />
        </Field>
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={changing}
        >
          {changing ? <Spinner /> : <KeyRound className="h-4 w-4" />}
          {changing ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Card>
  );
}
