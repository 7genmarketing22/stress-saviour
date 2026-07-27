"use client";

import { Suspense } from "react";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function AdminChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatLayout allowedRoles={["doctor"]} />
    </Suspense>
  );
}

function ChatPageFallback() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center rounded-2xl border border-border bg-card">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
