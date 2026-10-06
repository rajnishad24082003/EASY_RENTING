"use client";

import { CheckCircle2, Clock, Eye, FileText, ShieldAlert, Trash2, Upload, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { Select, toOptions } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import { DOCUMENT_TYPES, IDENTITY_DOCUMENT_TYPES, type DocumentType, type VerificationStatus } from "@/lib/api/types";
import { sessionStore } from "@/lib/auth/session-store";
import { useAuth } from "@/lib/auth/use-auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/labels";
import { openProtectedFile } from "@/lib/protected-files";
import { cn } from "@/lib/utils";
import { useVerification, useVerificationMutations } from "../hooks";

const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DOC_BYTES = 5 * 1024 * 1024;

const STATUS_UI: Record<VerificationStatus, { icon: typeof Clock; tone: string; text: string }> = {
  UNVERIFIED: {
    icon: ShieldAlert,
    tone: "bg-amber-50 text-amber-900 border-amber-200",
    text: "Upload at least one government ID (Aadhaar, PAN, passport or driving licence) and submit for review.",
  },
  PENDING: {
    icon: Clock,
    tone: "bg-sky-50 text-sky-900 border-sky-200",
    text: "Our team is reviewing your documents. This usually takes less than a day.",
  },
  VERIFIED: {
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-900 border-emerald-200",
    text: "You're verified. Your active listings are visible to tenants.",
  },
  REJECTED: {
    icon: XCircle,
    tone: "bg-red-50 text-red-900 border-red-200",
    text: "Your verification was not approved. Update your documents and resubmit.",
  },
};

export function VerificationView() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useVerification();
  const { upload, remove, submit } = useVerificationMutations();
  const [documentType, setDocumentType] = useState<DocumentType>("AADHAAR");
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Keep the cached user (banner, badges) in sync if the status changed elsewhere.
  useEffect(() => {
    if (data && user && data.status !== user.verificationStatus) {
      sessionStore.setUser({ ...user, verificationStatus: data.status });
    }
  }, [data, user]);

  if (isPending) return <Skeleton className="h-96 w-full max-w-3xl rounded-2xl" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const editable = data.status === "UNVERIFIED" || data.status === "REJECTED";
  const hasIdentityDoc = data.documents.some((d) => IDENTITY_DOCUMENT_TYPES.includes(d.documentType));
  const ui = STATUS_UI[data.status];
  const StatusIcon = ui.icon;

  const onUpload = () => {
    if (!file) return;
    if (!DOC_TYPES.includes(file.type)) return void toast.error("Only PDF, JPEG or PNG files are allowed.");
    if (file.size > MAX_DOC_BYTES) return void toast.error("File must be 5 MB or smaller.");
    upload.mutate(
      { file, documentType },
      {
        onSuccess: () => {
          toast.success("Document uploaded");
          setFile(null);
          if (fileInput.current) fileInput.current.value = "";
        },
      },
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Owner verification</h1>
        <p className="text-sm text-zinc-500">A one-time ID check that keeps EasyRenting free of fake listings.</p>
      </div>

      <div className={cn("flex gap-3 rounded-2xl border p-4", ui.tone)}>
        <StatusIcon className="mt-0.5 size-6 shrink-0" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="text-base font-semibold">{VERIFICATION_STATUS_LABELS[data.status]}</p>
          <p>{ui.text}</p>
          {data.status === "REJECTED" && data.rejectionReason && (
            <p className="rounded-lg bg-white/60 p-2">
              <span className="font-medium">Reason:</span> {data.rejectionReason}
            </p>
          )}
          <p className="text-xs opacity-80">
            {data.submittedAt && `Submitted ${formatDateTime(data.submittedAt)}`}
            {data.reviewedAt && ` · Reviewed ${formatDateTime(data.reviewedAt)}`}
          </p>
        </div>
      </div>

      {editable && (
        <Card>
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
            <CardDescription>
              PDF, JPEG or PNG, up to 5 MB. Documents are only visible to you and our review team.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
            <FormField label="Document type" htmlFor="doc-type">
              <Select
                id="doc-type"
                value={documentType}
                options={toOptions(DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS)}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              />
            </FormField>
            <FormField label="File" htmlFor="doc-file">
              <input
                ref={fileInput}
                id="doc-file"
                type="file"
                accept={DOC_TYPES.join(",")}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block h-10 w-full rounded-xl border border-zinc-300 text-sm file:mr-3 file:h-full file:border-0 file:bg-zinc-100 file:px-3 file:text-sm file:font-medium"
              />
            </FormField>
            <Button onClick={onUpload} disabled={!file} loading={upload.isPending}>
              {!upload.isPending && <Upload aria-hidden />} Upload
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your documents</CardTitle>
        </CardHeader>
        <CardContent>
          {data.documents.length === 0 ? (
            <p className="text-sm text-zinc-500">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-100">
                    <FileText className="size-5 text-zinc-500" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {DOCUMENT_TYPE_LABELS[doc.documentType]}
                      {IDENTITY_DOCUMENT_TYPES.includes(doc.documentType) && <Badge variant="outline">ID</Badge>}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {doc.fileName} · {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openProtectedFile(doc.url).catch((e) => toast.error(getErrorMessage(e)))}
                  >
                    <Eye aria-hidden /> View
                  </Button>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${DOCUMENT_TYPE_LABELS[doc.documentType]}`}
                      loading={remove.isPending && remove.variables === doc.id}
                      onClick={() => remove.mutate(doc.id, { onSuccess: () => toast.success("Document removed") })}
                    >
                      <Trash2 className="text-red-600" aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editable && (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-500">
            {hasIdentityDoc ? "Ready to submit for review." : "Add at least one identity document to submit."}
          </p>
          <Button
            disabled={!hasIdentityDoc}
            loading={submit.isPending}
            onClick={() => submit.mutate(undefined, { onSuccess: () => toast.success("Submitted for review") })}
          >
            Submit for verification
          </Button>
        </div>
      )}
    </div>
  );
}
