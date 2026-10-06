"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateVisit } from "../hooks";
import { buildScheduledAt, todayInIndia } from "../slots";
import { TimeSlotPicker, type SlotValue } from "./time-slot-picker";

export function ScheduleVisitForm({ propertyId, onDone }: { propertyId: string; onDone?: () => void }) {
  const [slot, setSlot] = useState<SlotValue>(() => ({ date: todayInIndia(), time: null }));
  const [note, setNote] = useState("");
  const createVisit = useCreateVisit();
  const router = useRouter();

  const submit = () => {
    if (!slot.time) return;
    createVisit.mutate(
      { propertyId, scheduledAt: buildScheduledAt(slot.date, slot.time), note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Visit requested", {
            description: "The owner will confirm or suggest another time.",
            action: { label: "My visits", onClick: () => router.push("/dashboard/visits") },
          });
          setSlot((s) => ({ ...s, time: null }));
          setNote("");
          onDone?.();
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <TimeSlotPicker value={slot} onChange={setSlot} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="visit-note">Note for the owner (optional)</Label>
        <Textarea
          id="visit-note"
          rows={2}
          maxLength={500}
          placeholder="e.g. I'll be coming with my family"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button className="w-full" disabled={!slot.time} loading={createVisit.isPending} onClick={submit}>
        Request visit
      </Button>
      <p className="text-center text-xs text-zinc-500">
        Manage requests in{" "}
        <Link href="/dashboard/visits" className="underline">
          your visits
        </Link>
        .
      </p>
    </div>
  );
}
