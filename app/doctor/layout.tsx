"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { DoctorProvider, useDoctor } from "@/contexts/DoctorContext";
import { getNotifications } from "@/lib/doctor/api";
import { useEffect } from "react";

function DoctorLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; created_at: string; is_read: boolean }>
  >([]);
  const pathname = usePathname();
  const { profile } = useDoctor();

  useEffect(() => {
    getNotifications(profile.id)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [profile.id]);

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/appointments")) return "Manage Appointments";
    if (path.includes("/patients")) return "Patient Registry";
    if (path.includes("/schedule")) return "Availability Schedule";
    if (path.includes("/earnings")) return "Earnings & Reports";
    if (path.includes("/profile")) return "Professional Profile";
    return "Doctor Portal";
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar
        role="doctor"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-col md:pl-64 min-h-screen transition-all duration-200">
        <Header
          title={getPageTitle(pathname)}
          user={{
            name: profile.full_name,
            email: profile.email,
            role: "doctor",
            avatarUrl: profile.avatar_url ?? undefined,
          }}
          notifications={notifications}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 container max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DoctorProvider>
      <DoctorLayoutShell>{children}</DoctorLayoutShell>
    </DoctorProvider>
  );
}
