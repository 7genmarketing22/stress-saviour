"use client";

import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "@/contexts/ChatContext";
import { MessageSquare } from "lucide-react";

interface ChatLayoutProps {
  allowedRoles: Array<"patient" | "doctor" | "admin" | "super_admin">;
}

export function ChatLayout({ allowedRoles }: ChatLayoutProps) {
  const { activeConversationId } = useChat();
  // On mobile, track which panel is visible
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const handleSelectConversation = () => {
    setMobileView("chat");
  };

  const handleBack = () => {
    setMobileView("list");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
      {/* Left: Conversation List */}
      <aside
        className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col
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
          flex-1 flex flex-col min-w-0
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
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 bg-muted/20">
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
