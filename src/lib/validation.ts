import { Role, SellingUnit, WeightUnit } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const barcodeSchema = z
  .string()
  .trim()
  .min(4, "Barcode must be at least 4 characters")
  .max(64, "Barcode must be at most 64 characters")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Barcode may only contain letters, numbers, dots, dashes and underscores",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(200);

export const roleSchema = z.nativeEnum(Role);
export const sellingUnitSchema = z.nativeEnum(SellingUnit);
export const weightUnitSchema = z.nativeEnum(WeightUnit);

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),
  storeName: z
    .string()
    .trim()
    .min(2, "Store name must be at least 2 characters")
    .max(120, "Store name is too long"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(200),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password is too long"),
});

const productFields = {
  barcode: barcodeSchema,
  name: z.string().trim().min(1, "Name is required").max(200),
  brand: optionalText(120),
  category: optionalText(120),
  description: optionalText(1000),
  sellingUnit: sellingUnitSchema,
  weight: z.coerce.number().min(0).max(1_000_000),
  weightUnit: weightUnitSchema,
  price: z.coerce.number().min(0).max(99_999_999),
  stock: z.coerce.number().min(0).max(1_000_000_000),
  imageUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("Image URL must be a valid URL").max(2000).optional(),
  ),
  isActive: z.boolean(),
};

export const createProductSchema = z.object({
  ...productFields,
  sellingUnit: productFields.sellingUnit.default(SellingUnit.PIECE),
  weight: productFields.weight.default(0),
  weightUnit: productFields.weightUnit.default(WeightUnit.GRAM),
  price: productFields.price,
  stock: productFields.stock.default(0),
  isActive: productFields.isActive.default(true),
});

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const importProductsSchema = z.object({
  mode: z.enum(["upsert", "insert"]).default("upsert"),
  products: z
    .array(createProductSchema)
    .min(1, "Provide at least one product")
    .max(500, "You can import at most 500 products at a time"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  role: roleSchema.default(Role.STAFF),
  isActive: z.boolean().default(true),
});

const avatarSchema = z
  .string()
  .trim()
  .max(2_000_000, "Profile photo is too large")
  .refine(
    (value) =>
      /^https?:\/\//.test(value) ||
      /^data:image\/(png|jpe?g|webp);base64,/i.test(value),
    "Profile photo must be an image upload or a valid URL",
  );

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email: emailSchema,
    storeName: z
      .preprocess(
        emptyToNull,
        z.string().trim().max(120, "Store name is too long").nullable(),
      ),
    contactNumber: z
      .preprocess(
        emptyToNull,
        z
          .string()
          .trim()
          .max(40, "Contact number is too long")
          .regex(
            /^[0-9+()\-\s]{7,40}$/,
            "Enter a valid contact number",
          )
          .nullable(),
      ),
    address: z.preprocess(
      emptyToNull,
      z.string().trim().max(500, "Address is too long").nullable(),
    ),
    avatarUrl: z.preprocess(emptyToNull, avatarSchema.nullable()),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    role: roleSchema,
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const appSettingsSchema = z.object({
  storeName: z.string().trim().min(1).max(120),
  currency: z.string().trim().min(2).max(8),
  currencySymbol: z.string().trim().min(1).max(8),
  lowStockThreshold: z.coerce.number().min(0).max(1_000_000),
  scanEnabled: z.boolean(),
  scanSourceLabel: z.string().trim().min(1).max(60),
});

export const updateAppSettingsSchema = appSettingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "Provide at least one setting to update" },
);

export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((value) => (value === "all" ? undefined : value)),
  sort: z
    .enum(["createdAt", "updatedAt", "name", "price", "stock", "barcode"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const scanListQuerySchema = z.object({
  barcode: z.string().trim().max(64).optional(),
  productId: z.string().trim().max(64).optional(),
  userId: z.string().trim().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const auditListQuerySchema = z.object({
  action: z.string().trim().max(40).optional(),
  entity: z.string().trim().max(80).optional(),
  actorId: z.string().trim().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const userListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z.string().trim().max(40).optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((value) => (value === "all" ? undefined : value)),
});
