import type {
  AuditLog,
  Product,
  Role,
  ScanLog,
  User,
  WeightUnit,
} from "@prisma/client";

type DecimalLike = { toString(): string } | number | string | null | undefined;

const toNumber = (value: DecimalLike) => {
  if (value === null || value === undefined) return null;
  const number = Number(value.toString());
  return Number.isFinite(number) ? number : null;
};

const toIso = (value: Date | null | undefined) =>
  value ? value.toISOString() : null;

type UserSummary = {
  id: string;
  name: string;
  email: string;
};

type ProductWithUsers = Product & {
  createdBy?: UserSummary | null;
  updatedBy?: UserSummary | null;
};

export function serializeProduct(product: ProductWithUsers) {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
    sellingUnit: product.sellingUnit,
    weight: toNumber(product.weight),
    weightUnit: product.weightUnit,
    price: toNumber(product.price),
    stock: toNumber(product.stock),
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    createdBy: product.createdBy ?? null,
    updatedBy: product.updatedBy ?? null,
    createdAt: toIso(product.createdAt),
    updatedAt: toIso(product.updatedAt),
  };
}

export function serializeScanProduct(product: Product) {
  return {
    id: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    category: product.category,
    sellingUnit: product.sellingUnit,
    weight: toNumber(product.weight),
    weightUnit: product.weightUnit,
    price: toNumber(product.price),
    imageUrl: product.imageUrl,
  };
}

export function serializeUser(
  user: Pick<
    User,
    | "id"
    | "name"
    | "email"
    | "role"
    | "isActive"
    | "avatarUrl"
    | "address"
    | "contactNumber"
    | "storeName"
    | "lastLoginAt"
    | "createdAt"
    | "updatedAt"
  >,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    address: user.address,
    contactNumber: user.contactNumber,
    storeName: user.storeName,
    lastLoginAt: toIso(user.lastLoginAt),
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  };
}

type ScanWithRelations = ScanLog & {
  product?: { id: string; name: string } | null;
  user?: UserSummary | null;
};

export function serializeScan(scan: ScanWithRelations) {
  return {
    id: scan.id,
    barcode: scan.barcode,
    productId: scan.productId,
    productName: scan.productName ?? scan.product?.name ?? null,
    price: toNumber(scan.priceSnapshot),
    weight: toNumber(scan.weightSnapshot),
    weightUnit: scan.weightUnit as WeightUnit | null,
    source: scan.source,
    ipAddress: scan.ipAddress,
    userAgent: scan.userAgent,
    user: scan.user ?? null,
    createdAt: toIso(scan.createdAt),
  };
}

type AuditWithActor = AuditLog & {
  actor?: UserSummary | null;
};

export function serializeAudit(audit: AuditWithActor) {
  return {
    id: audit.id,
    action: audit.action,
    entity: audit.entity,
    entityId: audit.entityId,
    actor: audit.actor ?? null,
    actorEmail: audit.actorEmail,
    changes: audit.changes,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    createdAt: toIso(audit.createdAt),
  };
}

export function roleLabel(role: Role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    default:
      return "Staff";
  }
}
