-- Deleting a store account removes that store's scans and audit history.
ALTER TABLE "ScanLog" DROP CONSTRAINT "ScanLog_storeId_fkey";
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_storeId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
