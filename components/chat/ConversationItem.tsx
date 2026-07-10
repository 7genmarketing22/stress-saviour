"use client";

import { formatDistanceToNow } from "@/lib/utils/dateUtils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/types/chat";

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { other_user, last_message, last_message_at, unread_count } = conversation;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
        "hover:bg-muted/60 active:bg-muted",
        isActive ? "bg-primary/8 border-r-2 border-primary" : ""
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <UserAvatar
          name={other_user.full_name}
          avatarUrl={other_user.avatar_url}
          size="md"
        />
        {/* Online dot (placeholder — extend with presence later) */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              unread_count > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"
            )}
          >
            {other_user.full_name}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {formatDistanceToNow(last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={cn(
              "text-xs truncate",
              unread_count > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
            )}
          >
            {last_message ?? "No messages yet"}
          </span>
          {unread_count > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread_count > 99 ? "99+" : unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
