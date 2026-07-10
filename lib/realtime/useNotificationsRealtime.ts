"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/notifications/api";

interface Options {
  userId: string;
  /** Called with the new notification row whenever one is inserted. */
  onNew: (notification: AppNotification) => void;
  enabled?: boolean;
}

/**
 * Subscribes to realtime INSERT events on the notifications table,
 * filtered to the authenticated user's own rows.
 */
export function useNotificationsRealtime({ userId, onNew, enabled = true }: Options) {
  const callbackRef = useRef(onNew);
  callbackRef.current = onNew;

  const subscribe = useCallback(() => {
    if (!enabled || !userId) return () => {};

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callbackRef.current(payload.new as AppNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled]);

  useEffect(() => {
    const cleanup = subscribe();
    return cleanup;
  }, [subscribe]);
}
