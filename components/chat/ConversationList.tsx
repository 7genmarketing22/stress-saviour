"use client";

import { useState, useCallback } from "react";
import { useChat } from "@/contexts/ChatContext";
import { ConversationItem } from "./ConversationItem";
import { NewChatDialog } from "./NewChatDialog";
import { Search, Plus, MessageSquare } from "lucide-react";

interface ConversationListProps {
  allowedRoles: Array<"patient" | "doctor" | "admin" | "super_admin">;
  onSelect: () => void;
}

export function ConversationList({ allowedRoles, onSelect }: ConversationListProps) {
  const { conversations, activeConversationId, openConversation, isLoadingConversations } = useChat();
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);

  const filtered = conversations.filter((c) =>
    c.other_user.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback(
    (id: string) => {
      openConversation(id);
      onSelect();
    },
    [openConversation, onSelect]
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">Messages</h2>
            <button
              onClick={() => setShowNewChat(true)}
              title="New conversation"
              className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {isLoadingConversations ? (
            <LoadingSkeletons />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? "No conversations match your search." : "No conversations yet. Start a new one!"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => handleSelect(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        allowedRoles={allowedRoles}
      />
    </>
  );
}

function LoadingSkeletons() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded-full w-2/3" />
            <div className="h-2.5 bg-muted rounded-full w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
