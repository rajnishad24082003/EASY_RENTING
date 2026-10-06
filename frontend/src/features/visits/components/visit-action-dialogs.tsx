"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildScheduledAt, todayInIndia } from "../slots";
import { TimeSlotPicker, type SlotValue } from "./time-slot-picker";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: (reason: string | undefined) => void;
}

/** Optional free-text reason (used for reject/cancel). */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="visit-reason">Reason (optional)</Label>
          <Textarea
            id="visit-reason"
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button variant="destructive" loading={loading} onClick={() => onConfirm(reason.trim() || undefined)}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onConfirm: (proposedAt: string, note: string | undefined) => void;
}

export function RescheduleDialog({ open, onOpenChange, loading, onConfirm }: RescheduleDialogProps) {
  const [slot, setSlot] = useState<SlotValue>(() => ({ date: todayInIndia(), time: null }));
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Propose a new time" description="The tenant can accept the new time or cancel the visit.">
        <div className="space-y-4">
          <TimeSlotPicker value={slot} onChange={setSlot} idPrefix="reschedule" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-note">Note (optional)</Label>
            <Textarea
              id="reschedule-note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Back</Button>
          </DialogClose>
          <Button
            disabled={!slot.time}
            loading={loading}
            onClick={() => slot.time && onConfirm(buildScheduledAt(slot.date, slot.time), note.trim() || undefined)}
          >
            Send proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
