"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Options {
  /** When set, only listen for changes to this doctor's payments. */
  doctorId?: string;
  /** Called whenever a relevant payments row is inserted / updated / deleted. */
  onChange: () => void;
  enabled?: boolean;
}

/**
 * Subscribes to Supabase Realtime changes on the `payments` table so dashboards
 * stay in sync the instant an admin settles a payout (or a booking creates one).
 * RLS still applies, so a doctor only receives their own rows.
 */
export function usePaymentsRealtime({ doctorId, onChange, enabled = true }: Options) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`payments-realtime-${doctorId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          ...(doctorId ? { filter: `doctor_id=eq.${doctorId}` } : {}),
        },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId, enabled]);
}
