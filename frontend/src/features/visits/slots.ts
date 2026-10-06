/**
 * Visit slots are interpreted in India Standard Time (the backend's "local" time for the 08:00–20:00 rule),
 * regardless of the browser's timezone.
 */
export const VISIT_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const FIRST_SLOT_MIN = 8 * 60;
const LAST_SLOT_MIN = 19 * 60 + 30;
const SLOT_STEP_MIN = 30;
export const BOOKING_WINDOW_DAYS = 60;

const pad = (n: number) => n.toString().padStart(2, "0");

/** All bookable start times: "08:00" … "19:30". */
export function allSlots(): string[] {
  const slots: string[] = [];
  for (let m = FIRST_SLOT_MIN; m <= LAST_SLOT_MIN; m += SLOT_STEP_MIN) {
    slots.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return slots;
}

/** `("2026-10-07", "10:30")` → ISO instant for 10:30 IST on that date. */
export function buildScheduledAt(date: string, time: string): string {
  return new Date(`${date}T${time}:00${IST_OFFSET}`).toISOString();
}

/** Today's date (YYYY-MM-DD) in IST. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VISIT_TIME_ZONE }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isSlotInFuture(date: string, time: string, now: Date = new Date()): boolean {
  return new Date(buildScheduledAt(date, time)).getTime() > now.getTime();
}

/** Slots still bookable on `date` (all of them for future dates, none for past dates). */
export function availableSlots(date: string, now: Date = new Date()): string[] {
  return allSlots().filter((time) => isSlotInFuture(date, time, now));
}

/** "13:30" → "1:30 PM". */
export function formatSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}
