"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, Settings, LogOut, ChevronDown, Menu } from "lucide-react";
import { signOut } from "@/lib/auth/session";
import { timeAgo } from "@/lib/doctor/mappers";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface HeaderProps {
  title: string;
  user?: {
    name: string;
    email: string;
    role: "patient" | "doctor" | "admin";
    avatarUrl?: string;
  };
  notifications?: HeaderNotification[];
  onMenuClick: () => void;
}

export function Header({ title, user, notifications = [], onMenuClick }: HeaderProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  const displayUser = user || {
    name: "User Account",
    email: "user@stresssaviors.pk",
    role: "patient",
  };

  const getProfileHref = () => {
    if (displayUser.role === "patient") return "/patient/profile";
    if (displayUser.role === "doctor") return "/doctor/profile";
    if (displayUser.role === "admin") return "/admin/dashboard";
    return "/";
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6">
      {/* Left side: Menu toggle for mobile and Section title */}
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

      {/* Right side: Notifications and Profile Menu */}
      <div className="flex items-center gap-4">
        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive animate-pulse" />
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-border bg-popover shadow-lg z-40">
                <div className="p-4 border-b border-border">
                  <p className="font-semibold">Notifications</p>
                </div>
                <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-accent ${notification.is_read ? "" : "bg-accent/40"}`}
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {timeAgo(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground p-2 text-center">
                      No notifications yet
                    </p>
                  )}
                </div>
              </div>
            </>
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

          {/* Dropdown Menu */}
          {showProfileDropdown && (
            <>
              {/* Click-away backdrop */}
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
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
