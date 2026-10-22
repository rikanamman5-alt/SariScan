"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  ScanLine,
  ScrollText,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { roleLabels } from "@/lib/format";
import type { Role } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    href: "/admin/profile",
    label: "My profile",
    icon: UserRound,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    href: "/admin/scans",
    label: "Scan history",
    icon: ScanLine,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "ADMIN", "STAFF"],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark">
      <div className="flex flex-col items-center gap-4 text-white">
        <Logo variant="dark" />
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Spinner /> Loading your workspace…
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return <Splash />;
  }

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden bg-brand-dark text-white lg:flex xl:w-72">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] scanner-grid" />
        <div className="relative px-6 pt-7 pb-6">
          <Logo variant="dark" />
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.18em] text-white/35 uppercase">
            Workspace
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {active ? (
                  <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                ) : null}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    active ? "text-accent" : "text-white/50",
                  )}
                />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="h-[18px] w-[18px] text-white/50" />
              Open scanner
            </Link>
          </div>
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-bold text-ink">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(user.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[11px] text-white/45">
                {user.storeName || roleLabels[user.role]}
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64 xl:pl-72">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-ink">{user.name}</p>
              <p className="text-[10px] text-muted">
                {user.storeName || roleLabels[user.role]}
              </p>
            </div>
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand text-[11px] font-bold text-white">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(user.name)
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="rounded-lg p-2 text-muted transition hover:bg-brand-soft hover:text-brand"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
        <div className="no-scrollbar flex items-stretch overflow-x-auto px-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-[72px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-semibold transition",
                  active ? "text-brand" : "text-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-brand" : "text-muted/70",
                  )}
                />
                <span className="whitespace-nowrap">
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
