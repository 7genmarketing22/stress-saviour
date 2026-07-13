"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { DoctorProvider, useDoctor } from "@/contexts/DoctorContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { AuthSessionListener } from "@/components/auth/AuthSessionListener";
import { ProfileOptimizationModal } from "@/components/doctor/ProfileOptimizationModal";
import { checkProfileCompleteness } from "@/lib/doctor/profileCompleteness";

function DoctorLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile, doctorProfile, documents } = useDoctor();

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/appointments")) return "Manage Appointments";
    if (path.includes("/patients")) return "Patient Registry";
    if (path.includes("/assessments")) return "Patient Assessments";
    if (path.includes("/schedule")) return "Availability Schedule";
    if (path.includes("/earnings")) return "Earnings & Reports";
    if (path.includes("/profile")) return "Professional Profile";
    if (path.includes("/chat")) return "Messages";
    return "Doctor Portal";
  };

  const completeness = checkProfileCompleteness(profile, doctorProfile, documents);

  return (
    <NotificationProvider userId={profile.id}>
      <ChatProvider myId={profile.id} myName={profile.full_name}>
        <div className="min-h-screen overflow-x-hidden bg-muted/30">
          <AuthSessionListener />
          <Sidebar
            role="doctor"
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="flex min-h-screen min-w-0 flex-col transition-all duration-200 md:pl-64">
            <Header
              title={getPageTitle(pathname)}
              user={{
                name: profile.full_name,
                email: profile.email,
                role: "doctor",
                avatarUrl: profile.avatar_url ?? undefined,
              }}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>

          {/* Profile optimization popup — shows 8-10s after login, once per session */}
          <ProfileOptimizationModal
            completeness={completeness}
            doctorName={profile.full_name}
          />
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DoctorProvider>
      <DoctorLayoutShell>{children}</DoctorLayoutShell>
    </DoctorProvider>
  );
}

