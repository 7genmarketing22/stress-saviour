/** Clinic timezone — all bookable slots are expressed in Pakistan Standard Time. */
export const CLINIC_TIMEZONE = "Asia/Karachi";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Day-of-week (0=Sun … 6=Sat) for a calendar date in clinic timezone. */
export function getPkDayOfWeek(date: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+05:00`));

  return WEEKDAY_MAP[weekday] ?? 0;
}

/** Convert a clinic-local date + HH:MM time to a UTC ISO string for storage. */
export function pkDateTimeToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:00`).toISOString();
}
