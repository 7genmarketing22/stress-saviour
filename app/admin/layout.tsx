"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { AuthSessionListener } from "@/components/auth/AuthSessionListener";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";

function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useAdmin();

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/doctors")) return "Manage Doctors";
    if (path.includes("/patients")) return "Manage Patients";
    if (path.includes("/appointments")) return "Manage Appointments";
    if (path.includes("/payments")) return "Financial Oversight";
    if (path.includes("/staff")) return "Staff Management";
    if (path.includes("/reports")) return "Reports & Analytics";
    if (path.includes("/settings")) return "Settings";
    if (path.includes("/chat")) return "Messages";
    return "Admin Portal";
  };

  const isChat = pathname.includes("/chat");

  return (
    <NotificationProvider userId={profile.id}>
      <ChatProvider myId={profile.id} myName={profile.full_name}>
        <div className={isChat ? "h-dvh max-h-dvh overflow-hidden bg-muted/30" : "min-h-screen bg-muted/30"}>
          <AuthSessionListener />
          <Sidebar
            role="admin"
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div
            className={`flex flex-col md:pl-64 transition-all duration-200 ${
              isChat ? "h-full min-h-0 overflow-hidden" : "min-h-screen"
            }`}
          >
            <Header
              title={getPageTitle(pathname)}
              user={{
                name: profile.full_name,
                email: profile.email,
                role: profile.role === "super_admin" ? "super_admin" : "admin",
                avatarUrl: profile.avatar_url ?? undefined,
              }}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main
              className={
                isChat
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden p-0 md:p-6 md:container md:max-w-7xl md:mx-auto"
                  : "flex-1 p-4 md:p-6 container max-w-7xl mx-auto"
              }
            >
              {children}
            </main>
          </div>
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AdminProvider>
  );
}

