/** Statuses that occupy a doctor's calendar slot (not bookable by others). */
export const SLOT_OCCUPYING_STATUSES = [
  "scheduled",
  "ongoing",
  "completed",
  "pending_payment",
] as const;

/** Statuses that free a slot for re-booking. */
export const SLOT_FREEING_STATUSES = [
  "cancelled",
  "no_show",
  "expired_no_show",
] as const;

export type SlotOccupyingStatus = (typeof SLOT_OCCUPYING_STATUSES)[number];
export type SlotFreeingStatus = (typeof SLOT_FREEING_STATUSES)[number];

export type SlotUiStatus = "available" | "booked" | "blocked";

export function isSlotOccupyingStatus(status: string): boolean {
  return (SLOT_OCCUPYING_STATUSES as readonly string[]).includes(status);
}

export function isSlotFreeingStatus(status: string): boolean {
  return (SLOT_FREEING_STATUSES as readonly string[]).includes(status);
}

export function getSlotUiStatus(
  time: string,
  bookedSlots: string[],
  blockedSlots: string[],
): SlotUiStatus {
  if (blockedSlots.includes(time)) return "blocked";
  if (bookedSlots.includes(time)) return "booked";
  return "available";
}

export function isSlotSelectable(
  time: string,
  bookedSlots: string[],
  blockedSlots: string[],
): boolean {
  return getSlotUiStatus(time, bookedSlots, blockedSlots) === "available";
}

export function findFirstAvailableSlot(
  timeOptions: string[],
  bookedSlots: string[],
  blockedSlots: string[],
): string | null {
  return (
    timeOptions.find((time) => isSlotSelectable(time, bookedSlots, blockedSlots)) ??
    null
  );
}

/** Local extractor so Node tests don't need path aliases / .ts import extensions. */
function bookingErrorText(error: unknown): string {
  let raw = "";
  if (typeof error === "string") raw = error;
  else if (error instanceof Error) raw = error.message;
  else if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") raw = obj.message;
  }
  const text = raw.trim();
  if (!text || text === "{}" || text === "[object Object]") {
    return "Failed to book appointment";
  }
  return text;
}

/** Map Postgres unique-violation or trigger errors to user-facing messages. */
export function mapBookingErrorMessage(error: unknown): string {
  const msg = bookingErrorText(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";

  if (
    code === "23505" ||
    msg.includes("just booked") ||
    msg.includes("duplicate key")
  ) {
    return "This slot was just booked by another patient. Please choose a different time.";
  }
  if (msg.includes("SLOT_IN_PAST")) {
    return "The selected time has already passed. Please choose an upcoming slot.";
  }
  if (msg.includes("SLOT_BLOCKED")) {
    return "This doctor is unavailable at the selected time. Please choose a different slot.";
  }
  if (msg.includes("SLOT_OUTSIDE_HOURS")) {
    return "The selected time is outside the doctor's working hours. Please choose another slot.";
  }
  return msg;
}

export function shouldRefreshSlotsAfterBookingError(message: string): boolean {
  return (
    message.includes("just booked") ||
    message.includes("already booked") ||
    message.includes("unavailable") ||
    message.includes("working hours") ||
    message.includes("already passed")
  );
}
