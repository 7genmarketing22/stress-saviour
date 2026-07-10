"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";
import {
  Reply,
  Pencil,
  Trash2,
  Copy,
  Smile,
} from "lucide-react";

interface MessageContextMenuProps {
  message: ChatMessage;
  position: { x: number; y: number };
  onClose: () => void;
}

export function MessageContextMenu({
  message,
  position,
  onClose,
}: MessageContextMenuProps) {
  const { setReplyTo, editMessage, deleteMessage } = useChat();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position so menu stays in viewport
  const x = Math.min(position.x, window.innerWidth - 220);
  const y = Math.min(position.y, window.innerHeight - 260);

  const isMine = message.isMine ?? false;

  const actions = [
    {
      icon: Reply,
      label: "Reply",
      onClick: () => { setReplyTo(message); onClose(); },
      show: true,
    },
    {
      icon: Smile,
      label: "React",
      onClick: () => { onClose(); },
      show: true,
    },
    {
      icon: Copy,
      label: "Copy",
      onClick: () => {
        if (message.body) navigator.clipboard.writeText(message.body);
        onClose();
      },
      show: !!message.body,
    },
    {
      icon: Pencil,
      label: "Edit",
      onClick: () => {
        const newBody = window.prompt("Edit message:", message.body ?? "");
        if (newBody && newBody.trim() !== message.body) {
          editMessage(message.id, newBody.trim());
        }
        onClose();
      },
      show: isMine && !!message.body,
    },
    {
      icon: Trash2,
      label: "Delete for me",
      onClick: () => { deleteMessage(message.id, "for_me"); onClose(); },
      show: isMine,
      destructive: true,
    },
    {
      icon: Trash2,
      label: "Delete for everyone",
      onClick: () => { deleteMessage(message.id, "for_everyone"); onClose(); },
      show: isMine,
      destructive: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
        style={{ left: x, top: y }}
      >
        {actions
          .filter((a) => a.show)
          .map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors hover:bg-muted text-left",
                  action.destructive
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {action.label}
              </button>
            );
          })}
      </div>
    </>
  );
}
