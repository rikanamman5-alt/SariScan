export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export type SellingUnit =
  | "PIECE"
  | "PACK"
  | "KILOGRAM"
  | "GRAM"
  | "LITER"
  | "MILLILITER"
  | "SACK"
  | "BOX"
  | "BOTTLE"
  | "CAN";

export type WeightUnit =
  | "GRAM"
  | "KILOGRAM"
  | "MILLILITER"
  | "LITER"
  | "NONE";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatarUrl: string | null;
  address: string | null;
  contactNumber: string | null;
  storeName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  sellingUnit: SellingUnit;
  weight: number | null;
  weightUnit: WeightUnit;
  price: number | null;
  stock: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type ScanRecord = {
  id: string;
  barcode: string;
  productId: string | null;
  productName: string | null;
  price: number | null;
  weight: number | null;
  weightUnit: WeightUnit | null;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: UserSummary | null;
  createdAt: string;
};

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "PASSWORD_CHANGE"
  | "IMPORT"
  | "SETTINGS_UPDATE";

export type AuditRecord = {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  actor: UserSummary | null;
  actorEmail: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AppSettings = {
  storeName: string;
  currency: string;
  currencySymbol: string;
  lowStockThreshold: number;
  scanEnabled: boolean;
  scanSourceLabel: string;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type Stats = {
  products: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
    newLast7Days: number;
  };
  inventory: {
    value: number;
  };
  scans: {
    total: number;
    today: number;
    last7Days: number;
    perDay: Array<{ date: string; count: number }>;
  };
  topProducts: Array<{
    barcode: string;
    name: string;
    price: number | null;
    scans: number;
  }>;
  recentScans: ScanRecord[];
  settings: AppSettings;
  generatedAt: string;
};

export type ScanLookupResult = {
  found: true;
  product: {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    sellingUnit: SellingUnit;
    weight: number | null;
    weightUnit: WeightUnit;
    price: number | null;
    imageUrl: string | null;
  };
  store: {
    name: string;
    currency: string;
    currencySymbol: string;
  };
  scannedAt: string;
};
