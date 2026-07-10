"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, MessageReaction, MessageRead } from "@/types/chat";

interface Options {
  conversationId: string | null;
  myId: string;
  onNewMessage: (msg: ChatMessage) => void;
  onMessageUpdated: (msgId: string, patch: Partial<ChatMessage>) => void;
  onReactionChange: (msgId: string, reactions: MessageReaction[]) => void;
  onReadChange: (msgId: string, reads: MessageRead[]) => void;
  onTyping: (userId: string, isTyping: boolean) => void;
}

export function useChatRealtime({
  conversationId,
  myId,
  onNewMessage,
  onMessageUpdated,
  onReactionChange,
  onReadChange,
  onTyping,
}: Options) {
  // Stable refs so subscriptions don't re-run on every render
  const cbRef = useRef({ onNewMessage, onMessageUpdated, onReactionChange, onReadChange, onTyping });
  cbRef.current = { onNewMessage, onMessageUpdated, onReactionChange, onReadChange, onTyping };

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

    // ── 1. Messages channel (INSERT + UPDATE) ──────────────────
    const msgChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.sender_id === myId) return; // we already have optimistic state
          const msg: ChatMessage = {
            id: row.id as string,
            conversation_id: row.conversation_id as string,
            sender_id: row.sender_id as string,
            body: (row.body as string) ?? null,
            attachment: row.attachment_url
              ? {
                  url: row.attachment_url as string,
                  type: row.attachment_type as "image" | "file",
                  name: (row.attachment_name as string) ?? "attachment",
                  size: (row.attachment_size as number) ?? undefined,
                }
              : null,
            reply_to: null,
            reply_to_id: (row.reply_to_id as string) ?? null,
            reactions: [],
            reads: [],
            is_edited: (row.is_edited as boolean) ?? false,
            edited_at: (row.edited_at as string) ?? null,
            deleted_for_sender: (row.deleted_for_sender as boolean) ?? false,
            deleted_for_everyone: (row.deleted_for_everyone as boolean) ?? false,
            created_at: row.created_at as string,
            isMine: false,
          };
          cbRef.current.onNewMessage(msg);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          cbRef.current.onMessageUpdated(row.id as string, {
            body: (row.body as string) ?? null,
            is_edited: (row.is_edited as boolean) ?? false,
            edited_at: (row.edited_at as string) ?? null,
            deleted_for_everyone: (row.deleted_for_everyone as boolean) ?? false,
            deleted_for_sender: (row.deleted_for_sender as boolean) ?? false,
          });
        }
      )
      .subscribe();

    // ── 2. Reactions channel ───────────────────────────────────
    const reactChannel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (!row?.message_id) return;

          // Re-fetch all reactions for the affected message
          const { data } = await (supabase as any)
            .from("message_reactions")
            .select("emoji, user_id")
            .eq("message_id", row.message_id as string);

          const grouped = new Map<string, MessageReaction>();
          for (const r of (data as any[]) ?? []) {
            if (!grouped.has(r.emoji)) {
              grouped.set(r.emoji, { emoji: r.emoji, users: [], count: 0 });
            }
            const g = grouped.get(r.emoji)!;
            g.users.push(r.user_id);
            g.count++;
          }
          cbRef.current.onReactionChange(
            row.message_id as string,
            Array.from(grouped.values())
          );
        }
      )
      .subscribe();

    // ── 3. Read receipts channel ───────────────────────────────
    const readChannel = supabase
      .channel(`reads:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        (payload) => {
          const row = payload.new as { message_id: string; user_id: string; read_at: string };
          cbRef.current.onReadChange(row.message_id, [
            { user_id: row.user_id, read_at: row.read_at },
          ]);
        }
      )
      .subscribe();

    // ── 4. Typing presence (Broadcast) ────────────────────────
    const typingChannel = supabase
      .channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, isTyping } = payload.payload as {
          userId: string;
          isTyping: boolean;
        };
        if (userId !== myId) {
          cbRef.current.onTyping(userId, isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reactChannel);
      supabase.removeChannel(readChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, myId]);

  /** Broadcast a typing indicator to the other participant. */
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const supabase = createClient();
      supabase
        .channel(`typing:${conversationId}`)
        .send({
          type: "broadcast",
          event: "typing",
          payload: { userId: myId, isTyping },
        })
        .catch(() => {});
    },
    [conversationId, myId]
  );

  return { broadcastTyping };
}
