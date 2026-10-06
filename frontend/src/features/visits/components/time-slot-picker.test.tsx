import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { TimeSlotPicker, type SlotValue } from "./time-slot-picker";

const NOW = new Date("2026-10-07T07:15:00Z"); // 12:45 IST

function Harness({ initial, onChange }: { initial: SlotValue; onChange?: (v: SlotValue) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <TimeSlotPicker
      now={NOW}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
    />
  );
}

describe("TimeSlotPicker", () => {
  it("renders 08:00–19:30 slots and disables past ones for today", () => {
    render(<Harness initial={{ date: "2026-10-07", time: null }} />);
    const slots = screen.getAllByRole("radio");
    expect(slots).toHaveLength(24);
    expect(screen.getByRole("radio", { name: "8:00 AM" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "12:30 PM" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "1:00 PM" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "7:30 PM" })).toBeEnabled();
    expect(screen.getByLabelText("Date")).toHaveAttribute("min", "2026-10-07");
  });

  it("selects a slot", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ date: "2026-10-08", time: null }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "9:30 AM" }));
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-10-08", time: "09:30" });
    expect(screen.getByRole("radio", { name: "9:30 AM" })).toHaveAttribute("aria-checked", "true");
  });

  it("clears the selected time when switching to a date where it is in the past", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ date: "2026-10-08", time: "09:30" }} onChange={onChange} />);
    const date = screen.getByLabelText("Date");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-10-07");
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-10-07", time: null });
  });
});
