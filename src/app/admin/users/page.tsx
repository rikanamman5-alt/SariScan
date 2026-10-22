"use client";

import {
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "@/components/user-form";
import { useAuth } from "@/components/auth-provider";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Pagination,
  Skeleton,
  Spinner,
  inputClass,
} from "@/components/ui";
import { useApi, useDebouncedValue } from "@/lib/hooks";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { formatDateTime, roleLabels } from "@/lib/format";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/cn";

type RoleFilter = "all" | Role;
type StatusFilter = "all" | "true" | "false";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const roleTone: Record<Role, "green" | "blue" | "amber"> = {
  SUPER_ADMIN: "amber",
  ADMIN: "blue",
  STAFF: "green",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = new URLSearchParams({
    page: String(page),
    limit: "10",
  });
  if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
  if (role !== "all") query.set("role", role);
  if (status !== "all") query.set("isActive", status);

  const { data, pagination, loading, error, reload } = useApi<User[]>(
    isSuperAdmin ? `/admin/users?${query.toString()}` : null,
  );

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4500);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await apiFetch(`/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      showNotice(`${deleteTarget.name} was removed.`);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(
        err instanceof ApiClientError
          ? err.message
          : "Could not delete this user.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader
          title="Users"
          description="Manage store accounts and platform access."
        />
        <Card className="p-8">
          <EmptyState
            icon={<ShieldAlert className="h-6 w-6" />}
            title="Super Admin access required"
            description="Only a Super Admin can manage user accounts and permissions."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        description="Manage store accounts. Every user gets a separate private store workspace."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      {notice ? (
        <div className="mb-4 animate-fade-in">
          <Alert tone="success">{notice}</Alert>
        </div>
      ) : null}

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted/70" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email…"
              className={`${inputClass} pl-10`}
              aria-label="Search users"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as RoleFilter);
                setPage(1);
              }}
              className={`${inputClass} w-40`}
              aria-label="Filter by role"
            >
              <option value="all">All roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              className={`${inputClass} w-36`}
              aria-label="Filter by status"
            >
              <option value="all">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <Alert tone="error" title="Could not load users">
              {error.message}
            </Alert>
            <Button variant="secondary" className="mt-3" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="h-6 w-6" />}
            title="No users found"
            description="Try a different search, or create a store account."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4" />
                Add user
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="transition hover:bg-paper/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                              isSelf
                                ? "bg-brand text-white"
                                : "bg-brand-soft text-brand",
                            )}
                          >
                            {initials(user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                              {user.name}
                              {isSelf ? (
                                <span className="rounded bg-paper px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-muted uppercase">
                                  You
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={roleTone[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={user.isActive ? "green" : "neutral"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted">
                        {formatDateTime(user.lastLoginAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(user);
                              setFormOpen(true);
                            }}
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!isSelf ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(user);
                              }}
                              title="Delete user"
                              className="text-muted hover:bg-danger-soft hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit user" : "Add user"}
        description={
          editing
            ? "Update account details and permissions."
            : "Create a new account with its own private store workspace."
        }
        size="lg"
      >
        <UserForm
          user={editing}
          currentUserId={currentUser?.id ?? ""}
          onCancel={() => setFormOpen(false)}
          onSaved={(message) => {
            setFormOpen(false);
            setEditing(null);
            showNotice(message);
            reload();
          }}
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user?"
        description={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.email}) will lose access immediately.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Spinner /> : <Trash2 className="h-4 w-4" />}
              {deleting ? "Deleting…" : "Delete user"}
            </Button>
          </>
        }
      >
        {deleteError ? (
          <Alert tone="error">{deleteError}</Alert>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Scan history and audit records created by this user will be kept,
            but no longer linked to an account.
          </p>
        )}
      </Modal>
    </div>
  );
}
