"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, User, Settings, LogOut, ChevronDown, Menu,
  Calendar, CreditCard, ShieldCheck, Info, X, CheckCheck,
  MessageSquare, ClipboardList,
} from "lucide-react";
import { logout } from "@/lib/auth/session";
import { timeAgo } from "@/lib/doctor/mappers";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useNotifications } from "@/contexts/NotificationContext";
import type { AppNotification } from "@/lib/notifications/api";
import { notificationHref } from "@/lib/notifications/links";

interface HeaderProps {
  title: string;
  user?: {
    name: string;
    email: string;
    role: "patient" | "doctor" | "admin";
    avatarUrl?: string;
  };
  onMenuClick: () => void;
}

function notifIcon(type: string | null) {
  if (type === "appointment") return <Calendar className="h-4 w-4 text-brand-500" />;
  if (type === "payment") return <CreditCard className="h-4 w-4 text-emerald-500" />;
  if (type === "payout") return <CreditCard className="h-4 w-4 text-violet-500" />;
  if (type === "approval") return <ShieldCheck className="h-4 w-4 text-blue-500" />;
  if (type === "chat") return <MessageSquare className="h-4 w-4 text-sky-500" />;
  if (type === "assessment") return <ClipboardList className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function LiveToastBanner({ role }: { role: string }) {
  const router = useRouter();
  const { liveToast, dismissToast, markRead } = useNotifications();

  if (!liveToast) return null;

  const href = notificationHref(
    {
      id: liveToast.id,
      user_id: "",
      title: liveToast.title,
      message: liveToast.message,
      type: liveToast.type,
      is_read: false,
      metadata: liveToast.metadata,
      created_at: "",
    },
    role
  );

  const handleClick = () => {
    markRead(liveToast.id);
    dismissToast();
    router.push(href);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="fixed top-20 right-4 z-[60] flex items-start gap-3 w-80 rounded-xl border border-border bg-popover shadow-xl p-3 animate-in slide-in-from-right duration-300 cursor-pointer hover:bg-accent/40"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
        {notifIcon(liveToast.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{liveToast.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{liveToast.message}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismissToast();
        }}
        className="shrink-0 rounded-lg p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Header({ title, user, onMenuClick }: HeaderProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const displayUser = user || {
    name: "User Account",
    email: "user@stresssaviors.pk",
    role: "patient" as const,
  };

  const getProfileHref = () => {
    if (displayUser.role === "patient") return "/patient/profile";
    if (displayUser.role === "doctor") return "/doctor/profile";
    if (displayUser.role === "admin") return "/admin/settings";
    return "/";
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setShowProfileDropdown(false);
    setShowNotifications(false);
    try {
      await logout("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications((v) => !v);
  };

  const handleNotifClick = async (n: AppNotification) => {
    if (!n.is_read) markRead(n.id);
    setShowNotifications(false);
    router.push(notificationHref(n, displayUser.role));
  };

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", onOutside);
    }
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showNotifications]);

  return (
    <>
      <LiveToastBanner role={displayUser.role} />

      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl capitalize">
            {title}
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleOpenNotifications}
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-border bg-popover shadow-xl z-40 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead()}
                      className="flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-300 hover:text-brand-700 font-semibold transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((n) => {
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0 cursor-pointer ${
                            n.is_read
                              ? "hover:bg-accent/50"
                              : "bg-brand-50/60 dark:bg-brand-900/10 hover:bg-brand-100/60 dark:hover:bg-brand-900/20"
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug ${n.is_read ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                          {!n.is_read && (
                            <div className="h-2 w-2 shrink-0 rounded-full bg-brand-500 mt-1.5" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                      <Bell className="h-7 w-7 opacity-30" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <div className="hidden sm:block h-6 w-px bg-border" />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent text-sm transition-colors duration-200 cursor-pointer"
            >
              <UserAvatar
                name={displayUser.name}
                avatarUrl={displayUser.avatarUrl}
                size="xs"
                className="border-primary/20"
              />
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="font-medium text-xs leading-none">
                  {displayUser.name}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {displayUser.role.replace("_", " ")}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showProfileDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowProfileDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-popover p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-40 transition-all duration-200">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="font-semibold text-sm truncate">{displayUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{displayUser.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        router.push(getProfileHref());
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        router.push(getProfileHref());
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent cursor-pointer"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Account Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-border py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
