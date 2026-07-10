"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getConversations,
  getMessages,
  sendMessage as apiSend,
  editMessage as apiEdit,
  deleteMessage as apiDelete,
  toggleReaction as apiToggleReaction,
  markConversationRead,
  getOrCreateConversation,
  searchChatableUsers,
  clearConversation as apiClear,
  deleteConversation as apiDeleteConv,
} from "@/lib/chat/api";
import { uploadChatAttachment } from "@/lib/chat/storage";
import { useChatRealtime } from "@/lib/realtime/useChatRealtime";
import type {
  ChatConversation,
  ChatMessage,
  MessageDeleteMode,
  MessageReaction,
  MessageRead,
  ChatParticipant,
} from "@/types/chat";
import { createNotification } from "@/lib/notifications/api";

interface ChatContextValue {
  // State
  conversations: ChatConversation[];
  messages: ChatMessage[];
  activeConversationId: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  typingUsers: Record<string, boolean>; // userId → isTyping
  replyTo: ChatMessage | null;
  totalUnread: number;
  // Actions
  openConversation: (conversationId: string) => void;
  startConversation: (otherId: string) => Promise<string>;
  sendMessage: (body?: string, file?: File) => Promise<void>;
  editMessage: (msgId: string, newBody: string) => Promise<void>;
  deleteMessage: (msgId: string, mode: MessageDeleteMode) => Promise<void>;
  toggleReaction: (msgId: string, emoji: string) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
  setReplyTo: (msg: ChatMessage | null) => void;
  refreshConversations: () => Promise<void>;
  broadcastTyping: (isTyping: boolean) => void;
  searchUsers: (query: string, roles: Array<"patient" | "doctor" | "admin" | "super_admin">) => Promise<ChatParticipant[]>;
  clearActiveChat: () => Promise<void>;
  deleteActiveChat: () => Promise<void>;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({
  myId,
  myName,
  children,
}: {
  myId: string;
  myName: string;
  children: React.ReactNode;
}) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Conversations ────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await getConversations(myId);
      setConversations(data);
    } catch {
      // keep stale state
    } finally {
      setIsLoadingConversations(false);
    }
  }, [myId]);

  useEffect(() => {
    if (myId) refreshConversations();
  }, [myId, refreshConversations]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  // ── Open / switch conversation ───────────────────────────
  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversationId(conversationId);
      setMessages([]);
      setReplyTo(null);
      setTypingUsers({});
      setIsLoadingMessages(true);
      try {
        const data = await getMessages(conversationId, myId);
        setMessages(data.reverse()); // oldest first for rendering
        setHasMoreMessages(data.length === 40);
        // mark as read
        await markConversationRead(conversationId, myId);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, unread_count: 0 } : c
          )
        );
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [myId]
  );

  // ── Start new conversation ───────────────────────────────
  const startConversation = useCallback(
    async (otherId: string) => {
      const convId = await getOrCreateConversation(myId, otherId);
      await refreshConversations();
      await openConversation(convId);
      return convId;
    },
    [myId, openConversation, refreshConversations]
  );

  // ── Send message ─────────────────────────────────────────
  const sendMessage = useCallback(
    async (body?: string, file?: File) => {
      if (!activeConversationId) return;
      if (!body?.trim() && !file) return;

      let attachment: ChatMessage["attachment"] = null;
      if (file) {
        attachment = await uploadChatAttachment(activeConversationId, myId, file);
      }

      // Optimistic insert
      const optimistic: ChatMessage = {
        id: `opt-${Date.now()}`,
        conversation_id: activeConversationId,
        sender_id: myId,
        body: body?.trim() ?? null,
        attachment,
        reply_to: replyTo,
        reply_to_id: replyTo?.id ?? null,
        reactions: [],
        reads: [],
        is_edited: false,
        edited_at: null,
        deleted_for_sender: false,
        deleted_for_everyone: false,
        created_at: new Date().toISOString(),
        isMine: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setReplyTo(null);

      try {
        const sent = await apiSend({
          conversationId: activeConversationId,
          senderId: myId,
          body: body?.trim(),
          attachment: attachment
            ? {
                url: attachment.url,
                type: attachment.type,
                name: attachment.name,
                size: attachment.size ?? 0,
              }
            : undefined,
          replyToId: replyTo?.id,
        });
        // Replace optimistic with real
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? sent : m))
        );
        // Refresh conversations to update last_message preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  last_message: body?.trim() ?? (attachment?.type === "image" ? "📷 Image" : "📎 File"),
                  last_message_at: sent.created_at,
                }
              : c
          )
        );

        // Notify the other participant
        const activeConv = conversations.find((c) => c.id === activeConversationId);
        if (activeConv) {
          const preview = body?.trim()?.slice(0, 60) ?? (attachment?.type === "image" ? "Sent an image" : "Sent a file");
          createNotification(
            activeConv.other_user.id,
            myName,
            preview,
            "chat",
            { conversationId: activeConversationId }
          ).catch(() => {});
        }
      } catch {
        // Remove optimistic on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    },
    [activeConversationId, myId, myName, replyTo, conversations]
  );

  // ── Edit message ─────────────────────────────────────────
  const editMessage = useCallback(async (msgId: string, newBody: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, body: newBody, is_edited: true } : m
      )
    );
    await apiEdit(msgId, newBody);
  }, []);

  // ── Delete message ────────────────────────────────────────
  const deleteMessage = useCallback(
    async (msgId: string, mode: MessageDeleteMode) => {
      if (mode === "for_everyone") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, deleted_for_everyone: true, body: null, attachment: null } : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
      await apiDelete(msgId, mode);
    },
    []
  );

  // ── Toggle reaction ───────────────────────────────────────
  const toggleReaction = useCallback(
    async (msgId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const existing = m.reactions.find((r) => r.emoji === emoji);
          const hasReacted = existing?.users.includes(myId) ?? false;
          let newReactions: MessageReaction[];
          if (hasReacted) {
            newReactions = m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, users: r.users.filter((u) => u !== myId), count: r.count - 1 }
                  : r
              )
              .filter((r) => r.count > 0);
          } else {
            if (existing) {
              newReactions = m.reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, users: [...r.users, myId], count: r.count + 1 }
                  : r
              );
            } else {
              newReactions = [...m.reactions, { emoji, users: [myId], count: 1 }];
            }
          }
          return { ...m, reactions: newReactions };
        })
      );
      const msg = messages.find((m) => m.id === msgId);
      const hasReacted = msg?.reactions.find((r) => r.emoji === emoji)?.users.includes(myId) ?? false;
      await apiToggleReaction(msgId, myId, emoji, hasReacted);
    },
    [myId, messages]
  );

  // ── Load older messages (pagination) ─────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversationId || !hasMoreMessages || isLoadingMessages) return;
    const oldest = messages[0]?.created_at;
    setIsLoadingMessages(true);
    try {
      const older = await getMessages(activeConversationId, myId, oldest);
      setMessages((prev) => [...older.reverse(), ...prev]);
      setHasMoreMessages(older.length === 40);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [activeConversationId, hasMoreMessages, isLoadingMessages, messages, myId]);

  // ── Realtime callbacks ────────────────────────────────────
  const handleNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === msg.conversation_id
          ? {
              ...c,
              last_message: msg.body ?? (msg.attachment?.type === "image" ? "📷 Image" : "📎 File"),
              last_message_at: msg.created_at,
              unread_count: c.unread_count + 1,
            }
          : c
      )
    );
  }, []);

  const handleMessageUpdated = useCallback(
    (msgId: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const handleReactionChange = useCallback(
    (msgId: string, reactions: MessageReaction[]) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, reactions } : m))
      );
    },
    []
  );

  const handleReadChange = useCallback(
    (msgId: string, newReads: MessageRead[]) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, reads: [...m.reads.filter((r) => !newReads.find((nr) => nr.user_id === r.user_id)), ...newReads] }
            : m
        )
      );
    },
    []
  );

  const handleTyping = useCallback((userId: string, isTyping: boolean) => {
    setTypingUsers((prev) => ({ ...prev, [userId]: isTyping }));
    if (isTyping) {
      if (typingTimeouts.current[userId]) clearTimeout(typingTimeouts.current[userId]);
      typingTimeouts.current[userId] = setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [userId]: false }));
      }, 3000);
    }
  }, []);

  const clearActiveChat = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      await apiClear(activeConversationId, myId);
      setMessages([]);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  }, [activeConversationId, myId]);

  const deleteActiveChat = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      await apiDeleteConv(activeConversationId, myId);
      setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
      setActiveConversationId(null);
      setMessages([]);
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  }, [activeConversationId, myId]);

  const { broadcastTyping } = useChatRealtime({
    conversationId: activeConversationId,
    myId,
    onNewMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onReactionChange: handleReactionChange,
    onReadChange: handleReadChange,
    onTyping: handleTyping,
  });

  return (
    <ChatContext.Provider
      value={{
        conversations,
        messages,
        activeConversationId,
        isLoadingConversations,
        isLoadingMessages,
        hasMoreMessages,
        typingUsers,
        replyTo,
        totalUnread,
        openConversation,
        startConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        loadOlderMessages,
        setReplyTo,
        refreshConversations,
        broadcastTyping,
        searchUsers: searchChatableUsers,
        clearActiveChat,
        deleteActiveChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
