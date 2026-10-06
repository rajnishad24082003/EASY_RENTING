"use client";

import { Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, toOptions } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ROLES, type Role } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useAdminMutations, useAdminUsers } from "../hooks";

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | undefined>();
  const [page, setPage] = useState(0);
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAdminUsers(debouncedQ, role, page);
  const { setSuspended } = useAdminMutations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-zinc-500">Search accounts and suspend abusive users.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search users by name or email"
            placeholder="Search by name or email"
            className="pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          aria-label="Filter by role"
          className="sm:w-44"
          value={role ?? ""}
          placeholder="All roles"
          options={toOptions(ROLES, ROLE_LABELS)}
          onChange={(e) => {
            setRole((e.target.value || undefined) as Role | undefined);
            setPage(0);
          }}
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or role filter." />
      ) : (
        <Card className={cn("overflow-hidden", isPlaceholderData && "opacity-60")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Listings</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.content.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatarUrl} className="size-8 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span>{ROLE_LABELS[u.role]}</span>
                      {u.role === "OWNER" && (
                        <span className="block text-xs text-zinc-500">
                          {VERIFICATION_STATUS_LABELS[u.verificationStatus]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{u.role === "OWNER" ? u.listingCount : "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.suspended ? (
                        <Badge variant="danger">Suspended</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== "ADMIN" && (
                        <Button
                          size="sm"
                          variant={u.suspended ? "outline" : "ghost"}
                          className={u.suspended ? undefined : "text-red-600 hover:bg-red-50 hover:text-red-700"}
                          loading={setSuspended.isPending && setSuspended.variables?.id === u.id}
                          onClick={() =>
                            setSuspended.mutate(
                              { id: u.id, suspended: !u.suspended },
                              {
                                onSuccess: () =>
                                  toast.success(u.suspended ? `${u.name} reinstated` : `${u.name} suspended`),
                              },
                            )
                          }
                        >
                          {u.suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
