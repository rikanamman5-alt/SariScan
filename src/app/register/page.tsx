"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth-provider";
import { Alert, Button, Field, Spinner, inputClass } from "@/components/ui";
import { apiRequest, ApiClientError } from "@/lib/client-api";
import type { User } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest<{ user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, storeName, email, password }),
      });

      await refresh();

      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      router.replace(next?.startsWith("/admin") ? next : "/admin/profile");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Cannot create your account right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:flex-row">
      <div className="relative hidden overflow-hidden bg-brand-dark lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div className="pointer-events-none absolute inset-0 scanner-grid opacity-10" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <Logo variant="dark" />
        </div>

        <div className="relative max-w-md space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Your store, your catalog
          </span>
          <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-white xl:text-5xl">
            Register once.
            <br />
            <span className="text-accent">Scan and record.</span>
          </h1>
          <p className="text-base leading-relaxed text-white/60">
            Create your store account, add products by scanning a barcode or
            typing them in, then download your inventory as a PDF anytime.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Your own private store workspace",
              "Add products by scan or manually",
              "Every product is recorded automatically",
              "Download your inventory as PDF",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/35">
          SariScan · Built for Filipino stores
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Logo />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
          >
            <ArrowLeft className="h-4 w-4" />
            Sign in
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-8 hidden lg:block">
              <Logo />
            </div>

            <div className="mb-7">
              <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">
                Create your account
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Get started
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                Register first, then start adding and scanning your products.
              </p>
            </div>

            {error ? (
              <div className="mb-4">
                <Alert tone="error">{error}</Alert>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Full name" htmlFor="name">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Juana Dela Cruz"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              <Field label="Store name" htmlFor="storeName">
                <div className="relative">
                  <Store className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="storeName"
                    type="text"
                    required
                    autoComplete="organization"
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    placeholder="Rikz Sari-Sari Store"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              <Field label="Email address" htmlFor="email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="owner@store.com"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              <Field
                label="Password"
                htmlFor="password"
                hint="At least 8 characters"
              >
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-11 pl-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted transition hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field label="Confirm password" htmlFor="confirmPassword">
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? <Spinner /> : null}
                {loading ? "Creating account…" : "Create account"}
                {!loading ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-brand hover:text-brand-dark"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-3 text-center text-sm text-muted">
              Just scanning?{" "}
              <Link
                href="/"
                className="font-semibold text-brand hover:text-brand-dark"
              >
                Open the scanner
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
