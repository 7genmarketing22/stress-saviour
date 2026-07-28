"use client";

import { Suspense } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function AdminChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatLayout allowedRoles={["doctor", "patient", "super_admin"]} />
    </Suspense>
  );
}

function ChatPageFallback() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center rounded-none border-0 bg-card md:rounded-2xl md:border md:border-border">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
