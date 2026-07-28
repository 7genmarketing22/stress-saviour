"use client";

import { useState, useRef, useCallback } from "react";
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
  const touchPosRef = useRef({ x: 0, y: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);
  const didLongPress = useRef(false);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherUser = activeConv?.other_user;
  const isMine = message.isMine ?? false;

  const isDeleted = message.deleted_for_everyone;
  const isDeletedForMe = message.deleted_for_sender && isMine;

  const openContextMenuAt = useCallback(
    (clientX?: number, clientY?: number) => {
      if (typeof clientX === "number" && typeof clientY === "number") {
        setContextMenuPos({ x: clientX, y: clientY });
      } else if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        setContextMenuPos({
          x: isMine ? Math.max(12, rect.right - 200) : rect.left,
          y: Math.min(rect.bottom + 8, window.innerHeight - 280),
        });
      }
      setShowContextMenu(true);
    },
    [isMine]
  );

  if (isDeleted || isDeletedForMe) {
    return (
      <div className={cn("flex mb-1", isMine ? "justify-end" : "justify-start")}>
        <div className="max-w-xs px-3 py-2 rounded-2xl bg-muted/50 text-muted-foreground text-sm italic border border-border/50">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  // Long-press for mobile — store finger position so the menu opens nearby
  const handleTouchStart = (e: React.TouchEvent) => {
    didLongPress.current = false;
    const touch = e.touches[0];
    if (touch) {
      touchPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openContextMenuAt(touchPosRef.current.x, touchPosRef.current.y);
    }, 500);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchPosRef.current.y);
    // Cancel long-press if the user is scrolling
    if (dx > 10 || dy > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Right-click for desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenuAt(e.clientX, e.clientY);
  };

  // Read status ticks
  const isRead = message.reads.some((r) => r.user_id !== message.sender_id);
  const TickIcon = isRead ? CheckCheck : Check;

  return (
    <>
      <div
        ref={bubbleRef}
        className={cn(
          "flex items-end gap-2 mb-1 group",
          isMine ? "flex-row-reverse" : "flex-row"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        onClick={() => {
          // Ignore the click that fires right after a long-press
          if (didLongPress.current) {
            didLongPress.current = false;
          }
        }}
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

        <div className={cn("flex max-w-[min(75%,28rem)] flex-col", isMine ? "items-end" : "items-start")}>
          {/* Reply quote */}
          {message.reply_to && (
            <div
              className={cn(
                "mb-1 max-w-full rounded-2xl px-3 py-2 text-xs",
                isMine
                  ? "bg-primary/15 text-primary-foreground/90"
                  : "bg-muted/80 text-muted-foreground"
              )}
            >
              <p className="mb-0.5 text-[11px] font-semibold opacity-90">
                {message.reply_to.sender_id === message.sender_id ? "You" : otherUser?.full_name}
              </p>
              <p className="truncate opacity-80">{message.reply_to.body ?? "Attachment"}</p>
            </div>
          )}

          {/* Bubble */}
          <div
            className={cn(
              "relative cursor-pointer px-3.5 py-2.5 text-sm leading-relaxed shadow-sm transition-colors",
              isMine
                ? "rounded-[1.25rem] rounded-br-md bg-brand-500 text-white"
                : "rounded-[1.25rem] rounded-bl-md border border-slate-200/80 bg-white text-slate-800 dark:border-border dark:bg-card dark:text-foreground"
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
                  "mb-1 flex items-center gap-2 rounded-xl p-2",
                  isMine ? "bg-white/15 hover:bg-white/25" : "bg-slate-100 hover:bg-slate-50 dark:bg-muted dark:hover:bg-muted/80"
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
