"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Options {
  userId: string;
  /** Called when any conversation the user participates in is updated. */
  onChange: () => void;
  enabled?: boolean;
}

/**
 * Global (not conversation-scoped) realtime for the conversations table.
 * Message inserts bump last_message_at via trigger, so this keeps the
 * sidebar unread badge fresh even when the user is outside /chat.
 */
export function useConversationsRealtime({
  userId,
  onChange,
  enabled = true,
}: Options) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(
    null
  );
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupChannel = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) {
      const supabase = createClient();
      void supabase.removeChannel(channel);
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!enabled || !userId) return;

    cleanupChannel();

    const supabase = createClient();
    const channel = supabase
      .channel(`conversations-global-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `participant_a=eq.${userId}`,
        },
        () => callbackRef.current()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `participant_b=eq.${userId}`,
        },
        () => callbackRef.current()
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            subscribe();
          }, 2500);
        }
      });

    channelRef.current = channel;
  }, [userId, enabled, cleanupChannel]);

  useEffect(() => {
    subscribe();
    return cleanupChannel;
  }, [subscribe, cleanupChannel]);

  useEffect(() => {
    if (!enabled || !userId) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      callbackRef.current();
      subscribe();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, userId, subscribe]);
}
