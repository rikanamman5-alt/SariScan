-- Scope products, scans and audit logs to the account that owns the store.

ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;

UPDATE "Product"
SET "storeId" = COALESCE(
  "createdById",
  (SELECT "id" FROM "User" ORDER BY CASE WHEN "role" = 'SUPER_ADMIN' THEN 0 ELSE 1 END, "createdAt" LIMIT 1)
)
WHERE "storeId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "storeId" SET NOT NULL;

DROP INDEX "Product_barcode_key";
CREATE UNIQUE INDEX "Product_storeId_barcode_key" ON "Product"("storeId", "barcode");
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScanLog" ADD COLUMN "storeId" TEXT;

UPDATE "ScanLog"
SET "storeId" = COALESCE(
  "userId",
  (SELECT "storeId" FROM "Product" WHERE "Product"."id" = "ScanLog"."productId")
)
WHERE "storeId" IS NULL;

CREATE INDEX "ScanLog_storeId_createdAt_idx" ON "ScanLog"("storeId", "createdAt");

ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD COLUMN "storeId" TEXT;

UPDATE "AuditLog" SET "storeId" = "actorId" WHERE "storeId" IS NULL;

CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
