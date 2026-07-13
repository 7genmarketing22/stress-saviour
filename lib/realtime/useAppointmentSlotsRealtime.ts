"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Options {
  doctorId: string;
  onChange: () => void;
  enabled?: boolean;
}

/**
 * Subscribes to appointment INSERT/UPDATE/DELETE for a doctor so booking
 * calendars refresh immediately when another patient books or cancels.
 */
export function useAppointmentSlotsRealtime({
  doctorId,
  onChange,
  enabled = true,
}: Options) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled || !doctorId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`appointment-slots-${doctorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => callbackRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, enabled]);
}
