"use client";

import { ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/errors";
import type { VerificationDocumentDto } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { DOCUMENT_TYPE_LABELS } from "@/lib/labels";
import { openProtectedFile, useProtectedObjectUrl } from "@/lib/protected-files";

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

/** Thumbnail (for images) + "open in new tab" for a private verification document. */
export function DocumentPreview({ document }: { document: VerificationDocumentDto }) {
  const isImage = IMAGE_EXT.test(document.fileName);
  const { objectUrl, failed } = useProtectedObjectUrl(isImage ? document.url : null);
  const open = () => openProtectedFile(document.url).catch((e) => toast.error(getErrorMessage(e)));

  return (
    <button
      type="button"
      onClick={open}
      className="group flex w-40 flex-col overflow-hidden rounded-xl border border-zinc-200 text-left transition-shadow hover:shadow-md"
      title={`Open ${document.fileName}`}
    >
      <div className="relative flex h-28 items-center justify-center bg-zinc-100">
        {isImage && objectUrl ? (
          // Blob URL of an access-controlled file: next/image can't fetch it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt={DOCUMENT_TYPE_LABELS[document.documentType]} className="size-full object-cover" />
        ) : isImage && !failed ? (
          <Skeleton className="size-full rounded-none" />
        ) : (
          <FileText className="size-8 text-zinc-400" aria-hidden />
        )}
        <ExternalLink
          className="absolute top-2 right-2 size-4 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{DOCUMENT_TYPE_LABELS[document.documentType]}</p>
        <p className="truncate text-[11px] text-zinc-500">
          {document.fileName} · {formatDate(document.uploadedAt)}
        </p>
      </div>
    </button>
  );
}
