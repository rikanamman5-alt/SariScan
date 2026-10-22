"use client";

import {
  Camera,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/page-header";
import { ChangePasswordCard } from "@/components/change-password-card";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Spinner,
  inputClass,
} from "@/components/ui";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { roleLabels } from "@/lib/format";
import type { User } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const AVATAR_SIZE = 320;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    image.src = url;
  });
}

async function prepareAvatar(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Photo is too large. Choose an image under 10 MB.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process this image.");

  const scale = Math.max(
    AVATAR_SIZE / image.naturalWidth,
    AVATAR_SIZE / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  context.drawImage(
    image,
    (AVATAR_SIZE - width) / 2,
    (AVATAR_SIZE - height) / 2,
    width,
    height,
  );

  return canvas.toDataURL("image/jpeg", 0.86);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [storeName, setStoreName] = useState(user?.storeName ?? "");
  const [contactNumber, setContactNumber] = useState(
    user?.contactNumber ?? "",
  );
  const [address, setAddress] = useState(user?.address ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onPhotoChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparingPhoto(true);

    try {
      const dataUrl = await prepareAvatar(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use this photo.");
    } finally {
      setPreparingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setFieldErrors({});

    try {
      await apiFetch<User>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          storeName: storeName.trim(),
          contactNumber: contactNumber.trim(),
          address: address.trim(),
          avatarUrl,
        }),
      });

      await refresh();
      setNotice("Profile saved. Your details will appear on exported PDF files.");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        setError("Could not save your profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Update your account, photo, and store details. These appear on the PDF inventory you share or print from a laptop."
      />

      {notice ? (
        <div className="mb-4 animate-fade-in">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-brand-soft shadow-card">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={`${name || "User"} profile photo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-brand">
                  {initials(name || user?.name || "SariScan")}
                </span>
              )}
            </div>

            <p className="mt-4 text-base font-bold text-ink">
              {name || user?.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Badge tone="green">{user ? roleLabels[user.role] : "Staff"}</Badge>
              {storeName.trim() ? (
                <Badge tone="neutral">{storeName.trim()}</Badge>
              ) : null}
            </div>

            <div className="mt-5 flex w-full flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) =>
                  void onPhotoChange(event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={preparingPhoto}
              >
                {preparingPhoto ? <Spinner /> : <Camera className="h-4 w-4" />}
                {preparingPhoto ? "Preparing photo…" : "Choose photo"}
              </Button>
              {avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAvatarUrl("")}
                  disabled={preparingPhoto}
                  className="text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove photo
                </Button>
              ) : null}
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              Use your phone camera or gallery. The photo is resized
              automatically before saving.
            </p>
          </div>

          <div className="mt-5 rounded-xl bg-paper px-3.5 py-3 text-xs text-muted">
            <p className="font-semibold text-ink-soft">Signed in as</p>
            <p className="mt-0.5 break-all">{user?.email}</p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          {error ? (
            <div className="mb-5">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}

          <div className="space-y-4">
            <Field
              label="Full name"
              htmlFor="name"
              error={fieldErrors.name}
              hint="Required"
            >
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Juana Dela Cruz"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>

            <Field
              label="Store name"
              htmlFor="storeName"
              error={fieldErrors.storeName}
              hint="Shown on PDF exports"
            >
              <div className="relative">
                <Store className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                <input
                  id="storeName"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Aling Nena Sari-Sari Store"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Contact number"
                htmlFor="contactNumber"
                error={fieldErrors.contactNumber}
              >
                <div className="relative">
                  <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="contactNumber"
                    type="tel"
                    inputMode="tel"
                    value={contactNumber}
                    onChange={(event) => setContactNumber(event.target.value)}
                    placeholder="0917 123 4567"
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>

              <Field
                label="Email"
                htmlFor="email"
                error={fieldErrors.email}
                hint="Used to sign in"
              >
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </Field>
            </div>

            <Field
              label="Complete address"
              htmlFor="address"
              error={fieldErrors.address}
            >
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-muted/70" />
                <textarea
                  id="address"
                  rows={4}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="House number, street, barangay, city, province"
                  className={`${inputClass} resize-none pl-10`}
                />
              </div>
            </Field>

            <Field
              label="Profile photo"
              htmlFor="avatarUrl"
              error={fieldErrors.avatarUrl}
              hint="Optional"
            >
              <input
                id="avatarUrl"
                value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="Or paste an image URL"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <p className="text-xs text-muted">
              Your store details are used on the PDF inventory header.
            </p>
            <Button type="submit" disabled={saving || preparingPhoto}>
              {saving ? <Spinner /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </Card>
      </form>

      <div className="mt-5">
        <ChangePasswordCard email={user?.email} />
      </div>
    </div>
  );
}
