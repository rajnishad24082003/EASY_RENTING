"use client";

import { CalendarClock, Check, MapPin, Phone, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PropertyImage } from "@/components/property-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Role, VisitDto } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useVisitAction, type VisitAction } from "../hooks";
import { ReasonDialog, RescheduleDialog } from "./visit-action-dialogs";
import { VisitStatusBadge } from "./visit-status-badge";

type DialogKind = "cancel" | "reject" | "reschedule" | null;

const SUCCESS_MESSAGES: Record<VisitAction["type"], string> = {
  confirm: "Visit confirmed",
  reject: "Visit declined",
  reschedule: "New time proposed",
  "accept-reschedule": "New time accepted",
  cancel: "Visit cancelled",
  complete: "Visit marked as completed",
};

const TENANT_CANCELLABLE = new Set(["REQUESTED", "CONFIRMED", "RESCHEDULE_PROPOSED"]);

export function VisitCard({ visit, viewerRole, now }: { visit: VisitDto; viewerRole: Role; now: number }) {
  const action = useVisitAction();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const isOwner = viewerRole === "OWNER";
  const counterpart = isOwner ? visit.tenant : visit.owner;
  const { status } = visit;
  const isPast = new Date(visit.scheduledAt).getTime() < now;

  const run = (payload: VisitAction) =>
    action.mutate(payload, {
      onSuccess: () => {
        toast.success(SUCCESS_MESSAGES[payload.type]);
        setDialog(null);
      },
    });

  const pendingType = action.isPending ? action.variables?.type : undefined;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row">
      <Link
        href={`/properties/${visit.property.id}`}
        className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-40"
        tabIndex={-1}
        aria-hidden
      >
        <PropertyImage src={visit.property.coverImageUrl} alt={visit.property.title} sizes="160px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/properties/${visit.property.id}`} className="line-clamp-1 font-semibold hover:underline">
              {visit.property.title}
            </Link>
            <p className="flex items-center gap-1 text-sm text-zinc-500">
              <MapPin className="size-3.5" aria-hidden /> {visit.property.locality}, {visit.property.city}
            </p>
          </div>
          <VisitStatusBadge status={status} />
        </div>

        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-zinc-800">
          <CalendarClock className="size-4 text-zinc-500" aria-hidden />
          {formatDateTime(visit.scheduledAt)}
          {status === "CONFIRMED" && isPast && <span className="font-normal text-zinc-500">(awaiting completion)</span>}
        </p>
        {status === "RESCHEDULE_PROPOSED" && visit.proposedAt && (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Owner proposed <strong>{formatDateTime(visit.proposedAt)}</strong>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600">
          <span>
            {isOwner ? "Tenant" : "Owner"}: <span className="font-medium text-zinc-900">{counterpart.name}</span>
          </span>
          {counterpart.phone ? (
            <a href={`tel:${counterpart.phone}`} className="flex items-center gap-1 text-brand-700 hover:underline">
              <Phone className="size-3.5" aria-hidden /> {counterpart.phone}
            </a>
          ) : (
            <span className="text-xs text-zinc-400">Phone shared once confirmed</span>
          )}
        </div>
        {visit.note && <p className="text-sm text-zinc-600">“{visit.note}”</p>}
        {visit.responseNote && (
          <p className="text-sm text-zinc-600">
            <span className="font-medium">Response:</span> {visit.responseNote}
          </p>
        )}

        <div className="mt-1 flex flex-wrap gap-2">
          {isOwner && status === "REQUESTED" && (
            <>
              <Button
                size="sm"
                loading={pendingType === "confirm"}
                onClick={() => run({ type: "confirm", id: visit.id })}
              >
                <Check aria-hidden /> Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>
                <CalendarClock aria-hidden /> Propose new time
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog("reject")}>
                <X aria-hidden /> Decline
              </Button>
            </>
          )}
          {isOwner && status === "CONFIRMED" && (
            <Button
              size="sm"
              variant="outline"
              disabled={!isPast}
              title={isPast ? undefined : "Available after the visit time"}
              loading={pendingType === "complete"}
              onClick={() => run({ type: "complete", id: visit.id })}
            >
              <Check aria-hidden /> Mark completed
            </Button>
          )}
          {!isOwner && status === "RESCHEDULE_PROPOSED" && (
            <Button
              size="sm"
              loading={pendingType === "accept-reschedule"}
              onClick={() => run({ type: "accept-reschedule", id: visit.id })}
            >
              <Check aria-hidden /> Accept new time
            </Button>
          )}
          {!isOwner && TENANT_CANCELLABLE.has(status) && (
            <Button size="sm" variant="ghost" onClick={() => setDialog("cancel")}>
              <X aria-hidden /> Cancel visit
            </Button>
          )}
        </div>
      </div>

      <ReasonDialog
        open={dialog === "cancel" || dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog === "reject" ? "Decline this visit?" : "Cancel this visit?"}
        description={dialog === "reject" ? "The tenant will be notified." : "The owner will be notified."}
        confirmLabel={dialog === "reject" ? "Decline visit" : "Cancel visit"}
        loading={pendingType === "reject" || pendingType === "cancel"}
        onConfirm={(reason) => run({ type: dialog === "reject" ? "reject" : "cancel", id: visit.id, reason })}
      />
      <RescheduleDialog
        open={dialog === "reschedule"}
        onOpenChange={(open) => !open && setDialog(null)}
        loading={pendingType === "reschedule"}
        onConfirm={(proposedAt, note) => run({ type: "reschedule", id: visit.id, proposedAt, note })}
      />
    </Card>
  );
}
