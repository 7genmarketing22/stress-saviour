"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications/api";
import { useNotificationsRealtime } from "@/lib/realtime/useNotificationsRealtime";
import { PushNotificationManager } from "@/components/pwa/PushNotificationManager";

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

export function NotificationProvider({ userId, children }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [liveToast, setLiveToast] = useState<LiveToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications(userId, 20);
      setNotifications(data);
    } catch {
      // silent - keep stale data
    }
  }, [userId]);

  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  const handleNewNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev].slice(0, 20));

    // Show a live toast for 5 seconds
    setLiveToast({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      metadata: n.metadata,
    });
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
        refresh,
      }}
    >
      <PushNotificationManager />
      {children}
    </NotificationContext.Provider>
  );
}
