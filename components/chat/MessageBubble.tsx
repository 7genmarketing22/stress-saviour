"use client";

import { useState, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import { ReactionPicker } from "./ReactionPicker";
import { MessageContextMenu } from "./MessageContextMenu";
import { ImageLightbox } from "./ImageLightbox";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatMessageTime } from "@/lib/utils/dateUtils";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, FileText, Download } from "lucide-react";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { conversations, activeConversationId, toggleReaction } = useChat();
  const [showReactions, setShowReactions] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherUser = activeConv?.other_user;
  const isMine = message.isMine ?? false;

  const isDeleted = message.deleted_for_everyone;
  const isDeletedForMe = message.deleted_for_sender && isMine;

  if (isDeleted || isDeletedForMe) {
    return (
      <div className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
        <div className="max-w-xs px-3 py-2 rounded-2xl bg-muted/50 text-muted-foreground text-sm italic border border-border/50">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  // Long-press for mobile reaction/context
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowContextMenu(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Right-click for desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Read status ticks
  const isRead = message.reads.some((r) => r.user_id !== message.sender_id);
  const TickIcon = isRead ? CheckCheck : Check;

  return (
    <>
      <div
        className={cn(
          "flex items-end gap-2 mb-1 group",
          isMine ? "flex-row-reverse" : "flex-row"
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar (other user only) */}
        {!isMine && otherUser && (
          <div className="shrink-0 mb-1">
            <UserAvatar
              name={otherUser.full_name}
              avatarUrl={otherUser.avatar_url}
              size="sm"
            />
          </div>
        )}

        <div className={cn("flex flex-col max-w-[75%]", isMine ? "items-end" : "items-start")}>
          {/* Reply quote */}
          {message.reply_to && (
            <div
              className={cn(
                "mb-1 px-3 py-1.5 rounded-xl border-l-4 text-xs max-w-full",
                isMine
                  ? "bg-primary/20 border-primary/60 text-primary-foreground/80"
                  : "bg-muted border-muted-foreground/30 text-muted-foreground"
              )}
            >
              <p className="font-semibold text-[11px] mb-0.5">
                {message.reply_to.sender_id === message.sender_id ? "You" : otherUser?.full_name}
              </p>
              <p className="truncate">{message.reply_to.body ?? "📎 Attachment"}</p>
            </div>
          )}

          {/* Bubble */}
          <div
            className={cn(
              "relative px-3 py-2 rounded-2xl shadow-sm text-sm leading-relaxed cursor-pointer",
              isMine
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card text-foreground border border-border/50 rounded-bl-sm"
            )}
            onDoubleClick={() => setShowReactions(true)}
          >
            {/* Image attachment */}
            {message.attachment?.type === "image" && (
              <button
                onClick={() => setLightboxUrl(message.attachment!.url)}
                className="block mb-1 rounded-xl overflow-hidden max-w-[240px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.attachment.url}
                  alt="Image"
                  className="w-full h-auto rounded-xl hover:opacity-90 transition-opacity"
                />
              </button>
            )}

            {/* File attachment */}
            {message.attachment?.type === "file" && (
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg mb-1",
                  isMine ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"
                )}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{message.attachment.name}</p>
                  {message.attachment.size && (
                    <p className="text-[10px] opacity-70">
                      {(message.attachment.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>
                <Download className="w-4 h-4 shrink-0 opacity-70" />
              </a>
            )}

            {/* Text */}
            {message.body && <p className="break-words">{message.body}</p>}

            {/* Edited label */}
            {message.is_edited && (
              <span className="text-[10px] opacity-60 ml-1">edited</span>
            )}
          </div>

          {/* Time + ticks row */}
          <div
            className={cn(
              "flex items-center gap-1 mt-0.5 px-1",
              isMine ? "flex-row-reverse" : "flex-row"
            )}
          >
            <span className="text-[10px] text-muted-foreground">
              {formatMessageTime(message.created_at)}
            </span>
            {isMine && (
              <TickIcon
                className={cn(
                  "w-3 h-3",
                  isRead ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => toggleReaction(message.id, r.emoji)}
                  className={cn(
                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                    r.users.includes(message.sender_id)
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted border-border text-foreground hover:bg-muted/80"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.count}</span>
                </button>
              ))}
              <button
                onClick={() => setShowReactions(true)}
                className="px-1.5 py-0.5 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:border-primary/40 transition-colors"
              >
                +
              </button>
            </div>
          )}

          {/* Quick react + context on hover (desktop) */}
          <div
            className={cn(
              "flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
              isMine ? "flex-row-reverse" : "flex-row"
            )}
          >
            <button
              onClick={() => setShowReactions(true)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none transition-transform hover:scale-125"
              title="React"
            >
              😊
            </button>
          </div>
        </div>
      </div>

      {/* Reaction Picker */}
      {showReactions && (
        <ReactionPicker
          messageId={message.id}
          onClose={() => setShowReactions(false)}
        />
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <MessageContextMenu
          message={message}
          position={contextMenuPos}
          onClose={() => setShowContextMenu(false)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}
