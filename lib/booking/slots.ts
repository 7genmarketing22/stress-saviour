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

/** Today's calendar date (YYYY-MM-DD) in the clinic timezone. */
export function getPkTodayDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar date (YYYY-MM-DD) in the clinic timezone, offset by N days from now. */
export function getPkDateWithOffset(days: number, now: Date = new Date()): string {
  return getPkTodayDate(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
}

/** Minutes elapsed since midnight in the clinic timezone. */
function getPkNowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Drop slot times that have already started when the booking date is today
 * (clinic timezone). Dates other than today are returned unchanged.
 */
export function filterPastSlotsForToday(
  times: string[],
  date: string,
  now: Date = new Date(),
): string[] {
  if (date !== getPkTodayDate(now)) return times;
  const nowMinutes = getPkNowMinutes(now);
  return times.filter((time) => parseTimeToMinutes(time) > nowMinutes);
}

/** True when the given clinic-local date + HH:MM slot has already started. */
export function isSlotInPast(date: string, time: string, now: Date = new Date()): boolean {
  const today = getPkTodayDate(now);
  if (date < today) return true;
  if (date > today) return false;
  return parseTimeToMinutes(time) <= getPkNowMinutes(now);
}

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

/** Format HH:MM (24h) as 12-hour time with AM/PM, e.g. "17:00" → "5:00 PM". */
export function formatSlotTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function formatSlotRange(start: string, end: string): string {
  return `${formatSlotTime(start)} – ${formatSlotTime(end)}`;
}
