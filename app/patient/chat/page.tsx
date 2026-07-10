"use client";

import { ChatLayout } from "@/components/chat/ChatLayout";

export default function PatientChatPage() {
  return <ChatLayout allowedRoles={["doctor"]} />;
}

