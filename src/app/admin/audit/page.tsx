"use client";

import { ScrollText, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Pagination,
  Skeleton,
  inputClass,
} from "@/components/ui";
import { useApi } from "@/lib/hooks";
import {
  auditActionLabels,
  formatDateTime,
} from "@/lib/format";
import type { AuditAction, AuditRecord } from "@/lib/types";

type Period = "all" | "today" | "7d" | "30d";

const actionTone: Record<
  AuditAction,
  "green" | "amber" | "red" | "neutral" | "blue"
> = {
  LOGIN: "green",
  LOGIN_FAILED: "red",
  LOGOUT: "neutral",
  CREATE: "green",
  UPDATE: "blue",
  DELETE: "red",
  ACTIVATE: "green",
  DEACTIVATE: "amber",
  PASSWORD_CHANGE: "amber",
  IMPORT: "blue",
  SETTINGS_UPDATE: "amber",
};

function periodStart(period: Period) {
  if (period === "all") return null;

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (period === "7d") start.setUTCDate(start.getUTCDate() - 6);
  if (period === "30d") start.setUTCDate(start.getUTCDate() - 29);

  return start.toISOString();
}

export default function AuditPage() {
  const { user } = useAuth();
  const canView = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  const [action, setAction] = useState<string>("all");
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({
    page: String(page),
    limit: "15",
  });
  if (action !== "all") query.set("action", action);
  if (from) query.set("from", from);

  const { data, pagination, loading, error, reload } = useApi<AuditRecord[]>(
    canView ? `/admin/audit-logs?${query.toString()}` : null,
  );

  if (!canView) {
    return (
      <div>
        <PageHeader title="Audit log" description="Every change made in the store." />
        <Card className="p-8">
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" />}
            title="Admin access required"
            description="Audit logs are available to Admins and Super Admins only."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        description="A permanent record of logins, product changes, user management and settings updates."
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} flex-1`}
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            {(
              Object.keys(auditActionLabels) as AuditAction[]
            ).map((key) => (
              <option key={key} value={key}>
                {auditActionLabels[key]}
              </option>
            ))}
          </select>
          <select
            value={period}
            onChange={(event) => {
              const next = event.target.value as Period;
              setPeriod(next);
              setFrom(periodStart(next));
              setPage(1);
            }}
            className={`${inputClass} sm:w-44`}
            aria-label="Filter by period"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <Alert tone="error" title="Could not load audit logs">
              {error.message}
            </Alert>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-6 w-6" />}
            title="No audit entries"
            description="Actions will appear here as soon as your team starts making changes."
          />
        ) : (
          <div className="divide-y divide-line">
            {data.map((entry) => (
              <div key={entry.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-muted">
                      <ScrollText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={actionTone[entry.action]}>
                          {auditActionLabels[entry.action]}
                        </Badge>
                        <span className="text-xs font-semibold text-ink">
                          {entry.entity}
                        </span>
                        {entry.entityId ? (
                          <span className="font-mono text-[10px] text-muted">
                            {entry.entityId.slice(0, 12)}…
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        <span className="font-medium text-ink-soft">
                          {entry.actor?.name ??
                            entry.actorEmail ??
                            "Unknown actor"}
                        </span>
                        {entry.actor?.email
                          ? ` · ${entry.actor.email}`
                          : ""}
                        {entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 pl-12 text-[11px] text-muted sm:pl-0">
                    {formatDateTime(entry.createdAt)}
                  </p>
                </div>

                {entry.changes &&
                Object.keys(entry.changes).length > 0 ? (
                  <details className="group mt-2 ml-12">
                    <summary className="cursor-pointer list-none text-[11px] font-semibold text-brand hover:text-brand-dark">
                      View changes
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-xl bg-paper px-3.5 py-3 font-mono text-[11px] leading-relaxed text-ink-soft">
                      {JSON.stringify(entry.changes, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {pagination && data && data.length > 0 ? (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
