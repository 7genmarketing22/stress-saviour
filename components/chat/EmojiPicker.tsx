"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
      "😋","😎","😍","🥰","🤩","😘","😗","😚","😙","🥲",
      "😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯",
      "😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒",
      "😓","😔","😕","🙃","🤑","😲","🙁","😖","😞","😟",
      "😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰",
      "😱","🥵","🥶","😳","🤪","😵","🤠","🥸","🤡","🤥",
      "🤫","🤭","🧐","🤓","😈","👿","👹","👺","💀","☠️",
    ],
  },
  {
    label: "Hands",
    emojis: [
      "👋","🤚","🖐","✋","🖖","👌","🤌","✌️","🤞","🤟",
      "🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎",
      "✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏",
      "✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "🎉","🎊","🎈","🎁","🏆","🥇","🏅","🎯","🎱","🎮",
      "🎲","🧩","🪄","🔑","💡","🔥","⭐","✨","💫","🌟",
      "💯","‼️","❓","❗","🆕","🆗","🆙","🔔","📢","📣",
    ],
  },
  {
    label: "Animals",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐦","🦆",
    ],
  },
  {
    label: "Food",
    emojis: [
      "🍕","🍔","🍟","🌮","🌯","🥗","🍜","🍝","🍣","🍱",
      "🍦","🍰","🎂","🍫","🍬","🍭","☕","🧋","🥤","🍺",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="bg-card border border-border rounded-2xl shadow-2xl w-72 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground">Emoji</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable emoji grid */}
      <div className="overflow-y-auto max-h-60 scrollbar-hide p-2 space-y-3">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">
              {cat.label}
            </p>
            <div className="grid grid-cols-10 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="text-lg hover:scale-125 transition-transform leading-none p-0.5 rounded hover:bg-muted flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
