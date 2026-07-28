"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markChatNotificationsRead,
  type AppNotification,
} from "@/lib/notifications/api";
import { useNotificationsRealtime } from "@/lib/realtime/useNotificationsRealtime";
import { PushNotificationManager } from "@/components/pwa/PushNotificationManager";
import { playNotificationSound } from "@/lib/notifications/sound";

interface LiveToast {
  id: string;
  title: string;
  message: string;
  type: string | null;
  metadata: Record<string, unknown> | null;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  liveToast: LiveToast | null;
  dismissToast: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Clear header unread for chat notifications tied to an opened conversation. */
  markChatConversationRead: (conversationId: string) => void;
  /** Tell the bell which chat is open so new chat notifs for it stay read. */
  setActiveChatConversationId: (conversationId: string | null) => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

interface Props {
  userId: string;
  children: React.ReactNode;
}

function notificationConversationId(n: AppNotification): string | null {
  const id = n.metadata?.conversationId;
  return typeof id === "string" ? id : null;
}

export function NotificationProvider({ userId, children }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [liveToast, setLiveToast] = useState<LiveToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatConversationIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications(userId, 20);
      // Don't clutter the bell with chat messages already seen in chat
      setNotifications(
        data.filter((n) => !(n.type === "chat" && n.is_read))
      );
    } catch {
      // silent - keep stale data
    }
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  const setActiveChatConversationId = useCallback((conversationId: string | null) => {
    activeChatConversationIdRef.current = conversationId;
  }, []);

  const handleNewNotification = useCallback((n: AppNotification) => {
    const activeChatId = activeChatConversationIdRef.current;
    const conversationId = notificationConversationId(n);
    const isActiveChatNotif =
      n.type === "chat" &&
      !!activeChatId &&
      conversationId === activeChatId;

    // Already viewing this chat — keep bell unread clear and skip toast,
    // but still play the chime (chat realtime may also play; sound is debounced).
    if (isActiveChatNotif) {
      setNotifications((prev) =>
        [
          { ...n, is_read: true },
          ...prev.filter(
            (x) =>
              !(
                x.type === "chat" &&
                notificationConversationId(x) === conversationId
              )
          ),
        ].slice(0, 20)
      );
      void markNotificationRead(n.id).catch(() => {});
      playNotificationSound();
      return;
    }

    // Chat: keep only the latest message per conversation in the bell list
    setNotifications((prev) => {
      const next =
        n.type === "chat" && conversationId
          ? prev.filter(
              (x) =>
                !(
                  x.type === "chat" &&
                  notificationConversationId(x) === conversationId
                )
            )
          : prev;
      return [n, ...next].slice(0, 20);
    });

    // Show a live toast for 5 seconds
    setLiveToast({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      metadata: n.metadata,
    });
    playNotificationSound();
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setLiveToast(null), 5000);
  }, []);

  useNotificationsRealtime({ userId, onNew: handleNewNotification, enabled: !!userId });

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsRead(userId).catch(() => {});
  }, [userId]);

  const markChatConversationRead = useCallback(
    async (conversationId: string) => {
      // Drop chat notifications for this thread from the bell list entirely —
      // the user has already seen the messages in chat.
      setNotifications((prev) =>
        prev.filter(
          (n) =>
            !(
              n.type === "chat" &&
              notificationConversationId(n) === conversationId
            )
        )
      );
      setLiveToast((prev) => {
        if (
          prev?.type === "chat" &&
          (prev.metadata?.conversationId as string | undefined) === conversationId
        ) {
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          return null;
        }
        return prev;
      });
      await markChatNotificationsRead(userId, conversationId).catch(() => {});
    },
    [userId]
  );

  const dismissToast = useCallback(() => {
    setLiveToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        liveToast,
        dismissToast,
        markRead,
        markAllRead,
        markChatConversationRead,
        setActiveChatConversationId,
        refresh,
      }}
    >
      <PushNotificationManager />
      {children}
    </NotificationContext.Provider>
  );
}
