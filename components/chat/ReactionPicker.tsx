"use client";

import { useChat } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "👎", "🙏"];

const EMOJI_GRID = [
  // Smileys
  "😀","😂","🥹","😍","🤩","😎","🥰","😢","😡","🤯","🥳","😴","🤔","🙄","😬",
  // Hands
  "👍","👎","👏","🙏","🤝","✌️","🤞","💪","👋",
  // Hearts
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❤️‍🔥",
  // Common
  "🎉","🎊","🔥","✨","⭐","💯","🚀","💡","🎯","✅","❌",
];

interface ReactionPickerProps {
  messageId: string;
  onClose: () => void;
}

export function ReactionPicker({ messageId, onClose }: ReactionPickerProps) {
  const { toggleReaction } = useChat();

  const handleReact = async (emoji: string) => {
    await toggleReaction(messageId, emoji);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Picker */}
      <div
        className={cn(
          "fixed z-50 bg-card border border-border rounded-2xl shadow-2xl p-3 w-72 animate-in fade-in zoom-in-95 duration-150",
          // Position near the message — simplified fixed placement
          "bottom-24 left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:absolute"
        )}
      >
        {/* Quick react row */}
        <div className="flex justify-between mb-2 pb-2 border-b border-border">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-xl hover:scale-125 transition-transform leading-none p-1 rounded-lg hover:bg-muted"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Full grid */}
        <div className="grid grid-cols-10 gap-0.5 max-h-40 overflow-y-auto scrollbar-hide">
          {EMOJI_GRID.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="text-lg hover:scale-125 transition-transform leading-none p-1 rounded-lg hover:bg-muted flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
