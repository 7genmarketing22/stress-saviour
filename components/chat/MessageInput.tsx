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

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
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
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(picked);
    e.target.value = ""; // reset so same file can be re-selected
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
    <div className="flex-shrink-0 border-t border-border bg-card">
      {/* Reply strip */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-xs">
          <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary">Replying to message</p>
            <p className="text-muted-foreground truncate">
              {replyTo.body ?? "📎 Attachment"}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {file && (
        <div className="px-4 pt-3">
          <AttachmentPreview file={file} onRemove={() => setFile(null)} />
        </div>
      )}
      {fileError && (
        <p className="px-4 pt-1 text-xs text-destructive">{fileError}</p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-3 py-3">
        {/* Emoji toggle */}
        <div className="relative">
          <button
            onClick={() => setShowEmoji((s) => !s)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50">
              <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>

        {/* File attach */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-muted/50 border border-border rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 leading-relaxed max-h-[120px] scrollbar-hide"
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "p-2.5 rounded-2xl transition-all duration-200 shrink-0",
            canSend
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md scale-100 hover:scale-105"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          title="Send"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
