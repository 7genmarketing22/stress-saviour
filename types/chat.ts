// Application-level chat types (rich, UI-facing)

export interface ChatParticipant {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "patient" | "doctor" | "admin" | "super_admin";
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // user_ids who reacted with this emoji
  count: number;
}

export interface MessageRead {
  user_id: string;
  read_at: string;
}

export interface MessageAttachment {
  url: string;
  type: "image" | "file";
  name: string;
  size?: number; // bytes
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment: MessageAttachment | null;
  reply_to: ChatMessage | null;
  reply_to_id: string | null;
  reactions: MessageReaction[];
  reads: MessageRead[];
  is_edited: boolean;
  edited_at: string | null;
  deleted_for_sender: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
  // UI helpers
  isMine?: boolean;
  showAvatar?: boolean; // first message in a group from the same sender
}

export interface ChatConversation {
  id: string;
  participant_a: string;
  participant_b: string;
  other_user: ChatParticipant;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export type TypingState = Record<string, boolean>; // conversationId → isTyping

export type MessageDeleteMode = "for_me" | "for_everyone";

export interface SendMessagePayload {
  conversationId: string;
  body?: string;
  file?: File;
  replyToId?: string;
}
