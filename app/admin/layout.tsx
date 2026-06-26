"use client";

import { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { Header } from "@/components/shared/Header";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard Overview";
    if (path.includes("/doctors")) return "Manage Doctors";
    if (path.includes("/patients")) return "Manage Patients";
    if (path.includes("/appointments")) return "Manage Appointments";
    if (path.includes("/payments")) return "Manage Payments";
    if (path.includes("/staff")) return "Staff Management";
    if (path.includes("/reports")) return "Reports & Analytics";
    return "Admin Portal";
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar Navigation */}
      <Sidebar
        role="admin"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col md:pl-64 min-h-screen transition-all duration-200">
        <Header
          title={getPageTitle(pathname)}
          user={{
            name: "Super Admin",
            email: "admin@stresssaviors.pk",
            role: "admin",
          }}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 container max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
