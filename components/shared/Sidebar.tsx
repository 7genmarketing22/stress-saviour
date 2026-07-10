"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/session";
import {
  LayoutDashboard,
  Calendar,
  UserCheck,
  FileText,
  CreditCard,
  User,
  Users,
  Clock,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Settings,
  LogOut,
  X,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { useContext } from "react";
// ChatContext is optional here — it may not be mounted on all portals yet
import { ChatContext } from "@/contexts/ChatContext";

interface SidebarProps {
  role: "patient" | "doctor" | "admin";
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Safely read unread count — ChatContext may not be mounted in all portals
  const chatCtx = useContext(ChatContext as React.Context<{ totalUnread: number } | null>);
  const totalUnread = chatCtx?.totalUnread ?? 0;

  // Define navigation items based on role
  const navigationMap = {
    patient: [
      { name: "Dashboard", href: "/patient/dashboard", icon: LayoutDashboard },
      { name: "Appointments", href: "/patient/appointments", icon: Calendar },
      { name: "Browse Doctors", href: "/patient/doctors", icon: UserCheck },
      { name: "Messages", href: "/patient/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Take Assessment", href: "/patient/assessment", icon: ClipboardList },
      { name: "Assessment History", href: "/patient/assessments", icon: FileText },
      { name: "Prescriptions", href: "/patient/prescriptions", icon: FileText },
      { name: "Payments", href: "/patient/payments", icon: CreditCard },
      { name: "My Profile", href: "/patient/profile", icon: User },
    ],
    doctor: [
      { name: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
      { name: "Appointments", href: "/doctor/appointments", icon: Calendar },
      { name: "Patient Assessments", href: "/doctor/assessments", icon: ClipboardList },
      { name: "My Patients", href: "/doctor/patients", icon: Users },
      { name: "Messages", href: "/doctor/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Schedule", href: "/doctor/schedule", icon: Clock },
      { name: "Earnings", href: "/doctor/earnings", icon: DollarSign },
      { name: "Profile Settings", href: "/doctor/profile", icon: User },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Manage Doctors", href: "/admin/doctors", icon: UserCheck },
      { name: "Manage Patients", href: "/admin/patients", icon: Users },
      { name: "Appointments", href: "/admin/appointments", icon: Calendar },
      { name: "Messages", href: "/admin/chat", icon: MessageSquare, badge: totalUnread },
      { name: "Payments", href: "/admin/payments", icon: CreditCard },
      { name: "Staff Management", href: "/admin/staff", icon: ShieldCheck },
      { name: "Reports & Analytics", href: "/admin/reports", icon: TrendingUp },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  };

  const navItems = navigationMap[role] || [];

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col border-r border-border bg-card px-4 py-6">
      {/* Brand Logo */}
      <div className="flex items-center justify-between px-2 mb-8">
        <Link href="/" className="flex items-center" aria-label="Stress Saviors home">
          <Image
            src="/stress-savious-logo.png"
            alt="Stress Saviors"
            width={280}
            height={112}
            className="h-14 w-auto"
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent hover:text-accent-foreground md:hidden cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const badge = (item as { badge?: number }).badge;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110", isActive ? "" : "text-muted-foreground")} />
              <span className="flex-1">{item.name}</span>
              {badge && badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="border-t border-border pt-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Slide-out Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out bg-card",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}
