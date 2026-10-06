"use client";

import { Check, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AdminVerificationDto, VerificationStatus } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { VERIFICATION_STATUS_LABELS } from "@/lib/labels";
import { useAdminMutations, useAdminVerifications } from "../hooks";
import { DocumentPreview } from "./document-preview";

const TABS: VerificationStatus[] = ["PENDING", "REJECTED", "VERIFIED", "UNVERIFIED"];

function RejectDialog({ target, onClose }: { target: AdminVerificationDto | null; onClose: () => void }) {
  const { reject } = useAdminMutations();
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const error = trimmed.length > 0 && trimmed.length < 5 ? "Reason must be at least 5 characters" : undefined;

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title="Reject verification"
        description={`Tell ${target?.owner.name ?? "the owner"} what needs fixing. They'll see this reason.`}
      >
        <FormField label="Reason" htmlFor="reject-reason" error={error} hint="5–500 characters">
          <Textarea
            id="reject-reason"
            rows={4}
            maxLength={500}
            value={reason}
            aria-invalid={!!error}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. The Aadhaar image is blurry — please upload a clearer scan."
          />
        </FormField>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={trimmed.length < 5}
            loading={reject.isPending}
            onClick={() =>
              target &&
              reject.mutate(
                { ownerId: target.owner.id, reason: trimmed },
                {
                  onSuccess: () => {
                    toast.success(`Rejected ${target.owner.name}`);
                    setReason("");
                    onClose();
                  },
                },
              )
            }
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminVerifications() {
  const [status, setStatus] = useState<VerificationStatus>("PENDING");
  const [page, setPage] = useState(0);
  const [rejecting, setRejecting] = useState<AdminVerificationDto | null>(null);
  const { data, isPending, isError, error, refetch } = useAdminVerifications(status, page);
  const { approve } = useAdminMutations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verifications</h1>
        <p className="text-sm text-zinc-500">Review owner identity documents.</p>
      </div>
      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as VerificationStatus);
          setPage(0);
        }}
      >
        <TabsList>
          {TABS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {VERIFICATION_STATUS_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Queue is empty" description="Nothing to review in this tab." />
      ) : (
        <div className="space-y-4">
          {data.content.map((item) => (
            <Card key={item.owner.id} className="space-y-4 p-5">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={item.owner.name} src={item.owner.avatarUrl} className="size-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.owner.name}</p>
                  <p className="text-sm text-zinc-500">
                    {item.owner.email} · {item.owner.phone}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {item.listingCount} listing{item.listingCount === 1 ? "" : "s"}
                    {item.verification.submittedAt && ` · Submitted ${formatDateTime(item.verification.submittedAt)}`}
                    {item.verification.reviewedAt && ` · Reviewed ${formatDateTime(item.verification.reviewedAt)}`}
                  </p>
                </div>
                <Badge
                  variant={
                    item.verification.status === "VERIFIED"
                      ? "success"
                      : item.verification.status === "REJECTED"
                        ? "danger"
                        : "warning"
                  }
                >
                  {VERIFICATION_STATUS_LABELS[item.verification.status]}
                </Badge>
              </div>
              {item.verification.rejectionReason && (
                <p className="rounded-lg bg-red-50 p-2 text-sm text-red-800">
                  Reason: {item.verification.rejectionReason}
                </p>
              )}
              {item.verification.documents.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {item.verification.documents.map((doc) => (
                    <DocumentPreview key={doc.id} document={doc} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No documents uploaded.</p>
              )}
              {item.verification.status === "PENDING" && (
                <div className="flex gap-2 border-t border-zinc-100 pt-4">
                  <Button
                    loading={approve.isPending && approve.variables === item.owner.id}
                    onClick={() =>
                      approve.mutate(item.owner.id, {
                        onSuccess: () => toast.success(`${item.owner.name} is now verified`),
                      })
                    }
                  >
                    <Check aria-hidden /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => setRejecting(item)}>
                    <X aria-hidden /> Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}
      <RejectDialog target={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}
