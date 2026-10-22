import type {
  AuditAction,
  Role,
  SellingUnit,
  WeightUnit,
} from "@/lib/types";

const weightFormatter = new Intl.NumberFormat("en-PH", {
  maximumFractionDigits: 2,
});

export function formatCurrency(
  value: number | null | undefined,
  symbol = "₱",
) {
  if (value === null || value === undefined) return "—";
  return `${symbol}${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return weightFormatter.format(value);
}

export function formatWeight(
  weight: number | null | undefined,
  unit: WeightUnit | null | undefined,
) {
  if (weight === null || weight === undefined) return "—";
  if (!unit || unit === "NONE") return "—";

  switch (unit) {
    case "GRAM":
      return weight >= 1000
        ? `${weightFormatter.format(weight / 1000)} kg`
        : `${weightFormatter.format(weight)} g`;
    case "KILOGRAM":
      return `${weightFormatter.format(weight)} kg`;
    case "MILLILITER":
      return weight >= 1000
        ? `${weightFormatter.format(weight / 1000)} L`
        : `${weightFormatter.format(weight)} mL`;
    case "LITER":
      return `${weightFormatter.format(weight)} L`;
    default:
      return "—";
  }
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatShortDay(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00Z`));
}

export const sellingUnitLabels: Record<SellingUnit, string> = {
  PIECE: "Piece",
  PACK: "Pack",
  KILOGRAM: "Kilogram",
  GRAM: "Gram",
  LITER: "Liter",
  MILLILITER: "Milliliter",
  SACK: "Sack",
  BOX: "Box",
  BOTTLE: "Bottle",
  CAN: "Can",
};

export const weightUnitLabels: Record<WeightUnit, string> = {
  GRAM: "Gram (g)",
  KILOGRAM: "Kilogram (kg)",
  MILLILITER: "Milliliter (mL)",
  LITER: "Liter (L)",
  NONE: "No weight",
};

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export const auditActionLabels: Record<AuditAction, string> = {
  LOGIN: "Login",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logout",
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  PASSWORD_CHANGE: "Password change",
  IMPORT: "Imported",
  SETTINGS_UPDATE: "Settings update",
};
