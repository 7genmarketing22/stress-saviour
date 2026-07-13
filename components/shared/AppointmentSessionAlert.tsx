"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { AppointmentSessionTiming } from "@/lib/appointments/session-timing";

interface Props {
  timing: AppointmentSessionTiming;
  className?: string;
}

const ACTIONABLE_PHASES = new Set([
  "reminder",
  "joinable",
  "grace_warning",
  "ongoing",
  "expired_pending",
  "expired_no_show",
]);

/** Countdown / grace warning shown on doctor + patient dashboards. */
export function AppointmentSessionAlert({ timing, className = "" }: Props) {
  useMinuteTick();

  if (timing.phase === "terminal" || timing.phase === "upcoming") return null;
  if (!ACTIONABLE_PHASES.has(timing.phase)) return null;
  if (!timing.showWarning && !timing.countdownLabel) return null;

  const isUrgent =
    timing.phase === "grace_warning" ||
    timing.phase === "expired_pending" ||
    timing.phase === "expired_no_show";

  return (
    <div
      className={`inline-flex w-fit max-w-full items-start gap-2 rounded-lg border px-3 py-1.5 text-xs ${
        isUrgent
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          : "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950/20 dark:text-brand-200"
      } ${className}`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 shrink">
        {timing.countdownLabel && (
          <p className="font-medium whitespace-nowrap">{timing.countdownLabel}</p>
        )}
        {timing.warningMessage && (
          <p className="mt-0.5 opacity-90 leading-snug max-w-xs">{timing.warningMessage}</p>
        )}
      </div>
    </div>
  );
}

/** Re-render every 30s so countdown labels stay fresh. */
function useMinuteTick() {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
}
