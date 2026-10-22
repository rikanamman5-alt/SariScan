import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
