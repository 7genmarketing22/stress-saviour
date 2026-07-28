"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [coords, setCoords] = useState(position);
  const openedAtRef = useRef(Date.now());

  // Close on outside click / Escape (ignore the long-press lift / ghost click)
  useEffect(() => {
    openedAtRef.current = Date.now();

    const onPointerDown = (e: Event) => {
      if (Date.now() - openedAtRef.current < 350) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep menu fully inside the viewport near the tap / click
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 12;
    let x = position.x;
    let y = position.y;

    if (x + rect.width > window.innerWidth - pad) {
      x = window.innerWidth - rect.width - pad;
    }
    if (x < pad) x = pad;

    if (y + rect.height > window.innerHeight - pad) {
      y = position.y - rect.height - 8;
    }
    if (y < pad) y = pad;

    setCoords({ x, y });
  }, [position]);

  const isMine = message.isMine ?? false;

  const actions = [
    {
      icon: Reply,
      label: "Reply",
      onClick: () => {
        setReplyTo(message);
        onClose();
      },
      show: true,
    },
    {
      icon: Smile,
      label: "React",
      onClick: () => {
        onClose();
      },
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
      onClick: () => {
        deleteMessage(message.id, "for_me");
        onClose();
      },
      show: isMine,
      destructive: true,
    },
    {
      icon: Trash2,
      label: "Delete for everyone",
      onClick: () => {
        deleteMessage(message.id, "for_everyone");
        onClose();
      },
      show: isMine,
      destructive: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => {
          if (Date.now() - openedAtRef.current < 350) return;
          onClose();
        }}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[180px] rounded-xl border border-border bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
        style={{ left: coords.x, top: coords.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions
          .filter((a) => a.show)
          .map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                  action.destructive
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {action.label}
              </button>
            );
          })}
      </div>
    </>
  );
}
