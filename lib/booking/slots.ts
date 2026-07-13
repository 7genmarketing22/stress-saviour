interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

const CLINIC_TIMEZONE = "Asia/Karachi";
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** YYYY-MM-DD booking date used by slot pickers. */
export function isValidBookingDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00+05:00`);
  return !Number.isNaN(parsed.getTime());
}

function parseBookingDate(date: string): Date | null {
  if (!isValidBookingDate(date)) return null;
  return new Date(`${date}T12:00:00+05:00`);
}

function getPkDayOfWeek(date: string): number {
  const parsed = parseBookingDate(date);
  if (!parsed) return 0;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "short",
  }).format(parsed);
  return WEEKDAY_MAP[weekday] ?? 0;
}

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimeSlotsForDate(
  slots: AvailabilitySlot[],
  date: string,
  durationMinutes = 30
): string[] {
  if (!isValidBookingDate(date)) return [];
  const dayOfWeek = getPkDayOfWeek(date);
  const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek);
  const times: string[] = [];

  for (const slot of daySlots) {
    const start = parseTimeToMinutes(slot.start_time);
    const end = parseTimeToMinutes(slot.end_time);
    const step = slot.slot_duration_minutes || durationMinutes;

    // Last bookable start must allow the full session to finish before closing.
    for (let t = start; t + durationMinutes <= end; t += step) {
      times.push(minutesToTime(t));
    }
  }

  return [...new Set(times)].sort();
}

/** Default session length from the doctor's availability config for a given date. */
export function getSessionDurationForDate(
  slots: AvailabilitySlot[],
  date: string,
  fallbackMinutes = 30,
): number {
  if (!isValidBookingDate(date)) return fallbackMinutes;
  const dayOfWeek = getPkDayOfWeek(date);
  const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek);
  if (daySlots.length === 0) return fallbackMinutes;
  return daySlots[0].slot_duration_minutes || fallbackMinutes;
}

export function getAvailableWeekdays(slots: AvailabilitySlot[]): number[] {
  return [...new Set(slots.map((s) => s.day_of_week))].sort();
}

export function formatSlotRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}
