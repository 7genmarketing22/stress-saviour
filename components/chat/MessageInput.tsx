"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { AttachmentPreview } from "./AttachmentPreview";
import { EmojiPicker } from "./EmojiPicker";
import { validateAttachment } from "@/lib/chat/storage";
import { cn } from "@/lib/utils";
import { Smile, Paperclip, Send, X, Reply } from "lucide-react";

export function MessageInput() {
  const { sendMessage, replyTo, setReplyTo, broadcastTyping } = useChat();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-grow — keep a usable mobile height even before the user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.max(44, Math.min(el.scrollHeight, 120));
    el.style.height = `${next}px`;
  }, [text]);

  const handleTyping = useCallback(
    (value: string) => {
      setText(value);
      broadcastTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => broadcastTyping(false), 2000);
    },
    [broadcastTyping]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const err = validateAttachment(picked);
    if (err) {
      setFileError(err);
      return;
    }
    setFileError(null);
    setFile(picked);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (isSending) return;
    if (!text.trim() && !file) return;
    setIsSending(true);
    try {
      await sendMessage(text.trim() || undefined, file ?? undefined);
      setText("");
      setFile(null);
      broadcastTyping(false);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const canSend = (text.trim().length > 0 || !!file) && !isSending;

  return (
    <div className="shrink-0 border-t border-border bg-card pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-0">
      {replyTo && (
        <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2 text-xs">
          <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary">Replying to message</p>
            <p className="truncate text-muted-foreground">
              {replyTo.body ?? "📎 Attachment"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {file && (
        <div className="px-4 pt-3">
          <AttachmentPreview file={file} onRemove={() => setFile(null)} />
        </div>
      )}
      {fileError && (
        <p className="px-4 pt-1 text-xs text-destructive">{fileError}</p>
      )}

      <div className="flex items-center gap-1.5 px-2 py-2.5 sm:gap-2 sm:px-3 sm:py-3">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-10 md:w-10"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-10 md:w-10"
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          enterKeyHint="send"
          className="min-h-[44px] max-h-[120px] min-w-0 flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-3.5 py-2.5 text-base leading-snug placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 scrollbar-hide sm:px-4 sm:text-sm sm:leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 md:h-10 md:w-10",
            canSend
              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md"
              : "cursor-not-allowed bg-muted text-muted-foreground"
          )}
          title="Send"
        >
          {isSending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
