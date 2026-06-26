interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
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
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  const daySlots = slots.filter((s) => s.day_of_week === dayOfWeek);
  const times: string[] = [];

  for (const slot of daySlots) {
    const start = parseTimeToMinutes(slot.start_time);
    const end = parseTimeToMinutes(slot.end_time);
    const step = slot.slot_duration_minutes || durationMinutes;

    for (let t = start; t + durationMinutes <= end; t += step) {
      times.push(minutesToTime(t));
    }
  }

  return [...new Set(times)].sort();
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
