import { describe, expect, it } from "vitest";
import { allSlots, availableSlots, buildScheduledAt, formatSlot, todayInIndia } from "./slots";

describe("visit slots", () => {
  it("offers 30-minute slots from 08:00 to 19:30", () => {
    const slots = allSlots();
    expect(slots[0]).toBe("08:00");
    expect(slots.at(-1)).toBe("19:30");
    expect(slots).toHaveLength(24);
  });

  it("builds an IST instant", () => {
    expect(buildScheduledAt("2026-10-07", "10:30")).toBe("2026-10-07T05:00:00.000Z");
  });

  it("only offers future slots today and none for past days", () => {
    const now = new Date("2026-10-07T07:15:00Z"); // 12:45 IST
    expect(todayInIndia(now)).toBe("2026-10-07");
    expect(availableSlots("2026-10-07", now)[0]).toBe("13:00");
    expect(availableSlots("2026-10-06", now)).toEqual([]);
    expect(availableSlots("2026-10-08", now)).toHaveLength(24);
  });

  it("formats slots in 12-hour time", () => {
    expect(formatSlot("08:00")).toBe("8:00 AM");
    expect(formatSlot("12:30")).toBe("12:30 PM");
    expect(formatSlot("19:30")).toBe("7:30 PM");
  });
});
