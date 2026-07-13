"use client";

import { useEffect, useRef } from "react";

/**
 * Triggers server-side reminder + expiry processing when dashboards mount,
 * then polls every 60s so both sides stay in sync.
 */
export function useAppointmentSessionSync(
  enabled = true,
  onAfterSync?: () => void
) {
  const onAfterSyncRef = useRef(onAfterSync);
  onAfterSyncRef.current = onAfterSync;

  useEffect(() => {
    if (!enabled) return;

    const sync = () => {
      fetch("/api/appointments/session-sync", { method: "POST" })
        .then(() => onAfterSyncRef.current?.())
        .catch(() => {});
    };

    sync();
    const id = setInterval(sync, 60_000);
    return () => clearInterval(id);
  }, [enabled]);
}
