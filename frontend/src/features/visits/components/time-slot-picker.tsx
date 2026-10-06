"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addDays, allSlots, BOOKING_WINDOW_DAYS, formatSlot, isSlotInFuture, todayInIndia } from "../slots";

export interface SlotValue {
  date: string;
  time: string | null;
}

interface TimeSlotPickerProps {
  value: SlotValue;
  onChange: (value: SlotValue) => void;
  /** Injected for tests; defaults to the current time. */
  now?: Date;
  idPrefix?: string;
}

/** Date + 30-minute slot picker (08:00–19:30 IST); past slots are disabled. */
export function TimeSlotPicker({ value, onChange, now, idPrefix = "visit" }: TimeSlotPickerProps) {
  const current = now ?? new Date();
  const today = todayInIndia(current);
  const dateId = `${idPrefix}-date`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={dateId}>Date</Label>
        <Input
          id={dateId}
          type="date"
          min={today}
          max={addDays(today, BOOKING_WINDOW_DAYS)}
          value={value.date}
          onChange={(e) => {
            const date = e.target.value;
            const keep = value.time && date && isSlotInFuture(date, value.time, current) ? value.time : null;
            onChange({ date, time: keep });
          }}
        />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-zinc-800">Time (IST)</legend>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Time slot">
          {allSlots().map((time) => {
            const disabled = !value.date || !isSlotInFuture(value.date, time, current);
            const selected = value.time === time;
            return (
              <button
                key={time}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onChange({ ...value, time })}
                className={cn(
                  "h-9 rounded-lg border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:border-zinc-100 disabled:text-zinc-300 disabled:line-through",
                  selected
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                )}
              >
                {formatSlot(time)}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
