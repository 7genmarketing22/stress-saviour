"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "@/contexts/ChatContext";
import { MessageSquare } from "lucide-react";

interface ChatLayoutProps {
  allowedRoles: Array<"patient" | "doctor" | "admin" | "super_admin">;
}

export function ChatLayout({ allowedRoles }: ChatLayoutProps) {
  const {
    activeConversationId,
    openConversation,
    closeConversation,
    conversations,
    isLoadingConversations,
  } = useChat();
  const searchParams = useSearchParams();
  const openedFromQuery = useRef<string | null>(null);
  // On mobile, track which panel is visible
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Open the conversation linked from a header notification click
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (!conversationId || isLoadingConversations) return;
    if (openedFromQuery.current === conversationId) return;
    if (!conversations.some((c) => c.id === conversationId)) return;

    openedFromQuery.current = conversationId;
    openConversation(conversationId);
    setMobileView("chat");
  }, [
    searchParams,
    conversations,
    isLoadingConversations,
    openConversation,
  ]);

  // Keep mobile panel in sync when conversation is closed externally (route leave).
  useEffect(() => {
    if (!activeConversationId) setMobileView("list");
  }, [activeConversationId]);

  const handleSelectConversation = () => {
    setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("list");
    // Clear active thread so bell/push suppression doesn't stick after leaving the chat.
    closeConversation();
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-row overflow-hidden border-border bg-card shadow-sm md:rounded-2xl md:border">
      {/* Left: Conversation List */}
      <aside
        className={`
          w-full md:w-80 lg:w-96 shrink-0 flex flex-col min-h-0
          border-r border-border bg-card
          ${mobileView === "chat" ? "hidden md:flex" : "flex"}
        `}
      >
        <ConversationList
          allowedRoles={allowedRoles}
          onSelect={handleSelectConversation}
        />
      </aside>

      {/* Right: Chat Window */}
      <main
        className={`
          flex min-h-0 min-w-0 flex-1 flex-col
          ${mobileView === "list" ? "hidden md:flex" : "flex"}
        `}
      >
        {activeConversationId ? (
          <ChatWindow onBack={handleBack} />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-8 bg-muted/20">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="w-10 h-10 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Your Messages</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Select a conversation from the list or start a new one to begin chatting.
        </p>
      </div>
    </div>
  );
}
