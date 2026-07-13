import type { AppointmentStatus } from "@/types";

/** Notify doctor + patient this many minutes before start. */
export const REMINDER_MINUTES_BEFORE = 10;
/** Keep join/start active this many minutes after scheduled start if call never began. */
export const GRACE_MINUTES_AFTER_START = 5;

export type SessionPhase =
  | "upcoming"
  | "reminder"
  | "joinable"
  | "grace_warning"
  | "expired_pending"
  | "ongoing"
  | "expired_no_show"
  | "terminal";

export interface AppointmentSessionTiming {
  phase: SessionPhase;
  /** Patient/doctor may open the video room (subject to payment + auth). */
  canJoin: boolean;
  /** Doctor may start the consultation (only during joinable/grace while still scheduled). */
  canStartCall: boolean;
  showWarning: boolean;
  warningMessage: string | null;
  countdownLabel: string | null;
  minutesUntilStart: number;
  minutesPastStart: number;
  minutesUntilGraceExpires: number;
  scheduledEndAt: string;
  graceEndsAt: string;
  shouldAutoExpire: boolean;
  shouldSendReminder: boolean;
}

function roundMinutes(ms: number): number {
  return Math.round(ms / 60_000);
}

/**
 * Shared timing rules for doctor + patient dashboards.
 * Grace is measured from scheduled **start** and only applies while status is still `scheduled`
 * (call never started → never became `ongoing`).
 */
export function getAppointmentSessionTiming(params: {
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  reminderSentAt?: string | null;
  now?: number;
}): AppointmentSessionTiming {
  const now = params.now ?? Date.now();
  const startMs = new Date(params.scheduledAt).getTime();
  const endMs = startMs + params.durationMinutes * 60_000;
  const reminderMs = startMs - REMINDER_MINUTES_BEFORE * 60_000;
  const graceEndMs = startMs + GRACE_MINUTES_AFTER_START * 60_000;

  const minutesUntilStart = roundMinutes(startMs - now);
  const minutesPastStart = Math.max(0, roundMinutes(now - startMs));
  const minutesUntilGraceExpires = Math.max(0, roundMinutes(graceEndMs - now));

  const base = {
    minutesUntilStart,
    minutesPastStart,
    minutesUntilGraceExpires,
    scheduledEndAt: new Date(endMs).toISOString(),
    graceEndsAt: new Date(graceEndMs).toISOString(),
    shouldAutoExpire: false,
    shouldSendReminder: false,
  };

  // Stale DB row: marked ongoing before the scheduled start time.
  const effectiveStatus =
    params.status === "ongoing" && now < startMs ? "scheduled" : params.status;

  if (params.status === "expired_no_show") {
    return {
      ...base,
      phase: "expired_no_show",
      canJoin: false,
      canStartCall: false,
      showWarning: false,
      warningMessage: null,
      countdownLabel: "Session expired — no one started the call",
      shouldAutoExpire: false,
      shouldSendReminder: false,
    };
  }

  if (effectiveStatus === "ongoing") {
    return {
      ...base,
      phase: "ongoing",
      canJoin: true,
      canStartCall: true,
      showWarning: false,
      warningMessage: null,
      countdownLabel: "Consultation in progress",
      shouldAutoExpire: false,
      shouldSendReminder: false,
    };
  }

  if (
    ["completed", "cancelled", "no_show", "pending_payment"].includes(effectiveStatus)
  ) {
    return {
      ...base,
      phase: "terminal",
      canJoin: false,
      canStartCall: false,
      showWarning: false,
      warningMessage: null,
      countdownLabel: null,
      shouldAutoExpire: false,
      shouldSendReminder: false,
    };
  }

  // status === scheduled (or stale ongoing corrected above)
  if (now < reminderMs) {
    return {
      ...base,
      phase: "upcoming",
      canJoin: false,
      canStartCall: false,
      showWarning: false,
      warningMessage: null,
      countdownLabel: null,
      shouldSendReminder: false,
    };
  }

  if (now < startMs) {
    const shouldSendReminder = !params.reminderSentAt;
    return {
      ...base,
      phase: "reminder",
      canJoin: minutesUntilStart <= REMINDER_MINUTES_BEFORE,
      canStartCall: false,
      showWarning: true,
      warningMessage: `Your consultation starts in ${minutesUntilStart} minute${minutesUntilStart === 1 ? "" : "s"}. Please be ready to join.`,
      countdownLabel: `Starts in ${minutesUntilStart} min`,
      shouldSendReminder,
    };
  }

  if (now < graceEndMs) {
    const label =
      minutesPastStart === 0
        ? "Starting now — join immediately"
        : `Started ${minutesPastStart} min ago — join now`;
    return {
      ...base,
      phase: minutesPastStart > 0 ? "grace_warning" : "joinable",
      canJoin: true,
      canStartCall: true,
      showWarning: minutesPastStart > 0,
      warningMessage:
        minutesPastStart > 0
          ? `Session expiring in ${minutesUntilGraceExpires} min — start the call now or it will be marked as a no-show.`
          : "Your session window is open. The doctor should start the consultation.",
      countdownLabel:
        minutesPastStart > 0
          ? `Expires in ${minutesUntilGraceExpires} min`
          : label,
      shouldAutoExpire: false,
    };
  }

  return {
    ...base,
    phase: "expired_pending",
    canJoin: false,
    canStartCall: false,
    showWarning: true,
    warningMessage:
      "This session was not started within the grace period and is being marked as expired.",
    countdownLabel: "Session expired",
    shouldAutoExpire: true,
  };
}

export function mapTimingToDisplayStatus(
  status: AppointmentStatus,
  timing: AppointmentSessionTiming
): string {
  if (status === "expired_no_show") return "Expired / No Show";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "no_show") return "No Show";
  if (timing.phase === "ongoing") return "Ready";

  if (timing.phase === "expired_pending") return "Expired";
  if (timing.phase === "grace_warning" || timing.phase === "joinable") return "Ready";
  if (timing.phase === "reminder") return "Starting Soon";
  return "Confirmed";
}
