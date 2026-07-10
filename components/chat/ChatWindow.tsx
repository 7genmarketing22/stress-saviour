"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDateDivider } from "@/lib/utils/dateUtils";
import { ArrowLeft, Search, MoreVertical } from "lucide-react";
import type { ChatMessage } from "@/types/chat";

interface ChatWindowProps {
  onBack: () => void;
}

export function ChatWindow({ onBack }: ChatWindowProps) {
  const {
    conversations,
    activeConversationId,
    messages,
    isLoadingMessages,
    hasMoreMessages,
    typingUsers,
    loadOlderMessages,
    clearActiveChat,
    deleteActiveChat,
  } = useChat();

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherUser = activeConv?.other_user;

  // Auto-scroll to bottom on new messages, not on older-message load
  useEffect(() => {
    if (isFirstLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
    } else {
      // Only auto-scroll if user is near bottom
      const el = scrollRef.current;
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distFromBottom < 200) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // Reset on conversation change
  useEffect(() => {
    isFirstLoad.current = true;
    setSearchMode(false);
    setSearchQuery("");
    setMenuOpen(false);
  }, [activeConversationId]);

  // Scroll-up to load older messages
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 100 && hasMoreMessages && !isLoadingMessages) {
      const prevHeight = el.scrollHeight;
      loadOlderMessages().then(() => {
        // Preserve scroll position after prepend
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  };

  // Group messages by date for dividers
  const grouped = groupMessagesByDate(messages);

  // Typing indicator
  const isTyping = Object.values(typingUsers).some(Boolean);

  // Search filter
  const displayMessages = searchQuery
    ? messages.filter((m) =>
        m.body?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  if (!activeConv || !otherUser) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <UserAvatar
          name={otherUser.full_name}
          avatarUrl={otherUser.avatar_url}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {otherUser.full_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{otherUser.role}</p>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => setSearchMode((s) => !s)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            title="Search messages"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              title="Conversation actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-40 rounded-xl bg-card border border-border shadow-lg py-1 z-20 text-sm animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) {
                        clearActiveChat();
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-foreground transition-colors"
                  >
                    Clear Chat
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this chat? It will be hidden and all messages cleared.")) {
                        deleteActiveChat();
                      }
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-muted text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Delete Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Search bar */}
      {searchMode && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this conversation…"
            className="w-full px-3 py-1.5 text-sm bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-1 bg-[hsl(var(--muted)/0.2)]"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 80%, hsl(var(--brand-pale)/0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--brand-cyan)/0.06) 0%, transparent 50%)",
        }}
      >
        {isLoadingMessages && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {searchQuery
          ? displayMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          : grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full font-medium">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {msgs.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
              </div>
            ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-2">
            <UserAvatar
              name={otherUser.full_name}
              avatarUrl={otherUser.avatar_url}
              size="sm"
            />
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
  );
}

function groupMessagesByDate(
  messages: ChatMessage[]
): { date: string; msgs: ChatMessage[] }[] {
  const map = new Map<string, ChatMessage[]>();
  for (const msg of messages) {
    const key = formatDateDivider(msg.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(msg);
  }
  return Array.from(map.entries()).map(([date, msgs]) => ({ date, msgs }));
}
