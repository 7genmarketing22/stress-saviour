"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";
import { PatientProvider, usePatient } from "@/contexts/PatientContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";

function PatientLayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = usePatient();

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/appointments")) return "My Appointments";
    if (path.includes("/doctors")) return "Browse Doctors";
    if (path.includes("/prescriptions")) return "My Prescriptions";
    if (path.includes("/payments")) return "Billing & Payments";
    if (path.includes("/profile")) return "Profile Settings";
    if (path.includes("/chat")) return "Messages";
    if (path.includes("/assessment")) return "Behavioral Assessment";
    if (path.includes("/assessments")) return "Assessment History";
    return "Patient Portal";
  };

  return (
    <NotificationProvider userId={profile.id}>
      <ChatProvider myId={profile.id} myName={profile.full_name}>
        <div className="min-h-screen bg-muted/30">
          <Sidebar
            role="patient"
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="flex flex-col md:pl-64 min-h-screen transition-all duration-200">
            <Header
              title={getPageTitle(pathname)}
              user={{
                name: profile.full_name,
                email: profile.email,
                role: "patient",
                avatarUrl: profile.avatar_url ?? undefined,
              }}
              onMenuClick={() => setIsSidebarOpen(true)}
            />
            <main className="flex-1 p-4 md:p-6 container max-w-7xl mx-auto">
              {children}
            </main>
          </div>
        </div>
      </ChatProvider>
    </NotificationProvider>
  );
}

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <PatientLayoutShell>{children}</PatientLayoutShell>
    </PatientProvider>
  );
}

