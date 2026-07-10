"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";

export default function DoctorChatPage() {
  return <ChatLayout allowedRoles={["patient", "admin", "super_admin"]} />;
}

