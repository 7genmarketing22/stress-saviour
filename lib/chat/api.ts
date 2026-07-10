import { createClient } from "@/lib/supabase/client";
import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  MessageDeleteMode,
  MessageReaction,
} from "@/types/chat";

// Helper — casts client to any for new tables not yet in the generated DB types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createClient() as any;
}

// ─────────────────────────────────────────────
// Conversation helpers
// ─────────────────────────────────────────────

/** Get or create a conversation between two users (via the DB RPC). */
export async function getOrCreateConversation(
  myId: string,
  otherId: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await (supabase as any).rpc("get_or_create_conversation", {
    user_a: myId,
    user_b: otherId,
  });
  if (error) throw error;
  return data as string;
}

/** Fetch all conversations for the current user with last-message preview and unread count. */
export async function getConversations(myId: string): Promise<ChatConversation[]> {
  const supabase = createClient();

  const { data: rows, error } = await db()
    .from("conversations")
    .select("id, participant_a, participant_b, last_message_at, created_at, deleted_by_a, deleted_by_b")
    .or(`participant_a.eq.${myId},participant_b.eq.${myId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  if (!rows?.length) return [];

  // Filter out conversations deleted by the current user
  const activeRows = (rows as any[]).filter((r: any) => {
    if (r.participant_a === myId) return !r.deleted_by_a;
    if (r.participant_b === myId) return !r.deleted_by_b;
    return true;
  });

  if (!activeRows.length) return [];

  const otherIds = activeRows.map((r: any) =>
    r.participant_a === myId ? r.participant_b : r.participant_a
  );

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("id", otherIds);
  if (pErr) throw pErr;

  const profileMap = new Map<string, ChatParticipant>(
    ((profiles ?? []) as ChatParticipant[]).map((p) => [p.id, p])
  );

  const results: ChatConversation[] = await Promise.all(
    activeRows.map(async (row: any) => {
      const otherId =
        row.participant_a === myId ? row.participant_b : row.participant_a;
      const other_user = profileMap.get(otherId) ?? {
        id: otherId,
        full_name: "Unknown",
        avatar_url: null,
        role: "patient" as const,
      };

      const clearedAt = row.participant_a === myId ? row.cleared_at_a : row.cleared_at_b;

      let msgQuery = db()
        .from("messages")
        .select("body, attachment_type, created_at")
        .eq("conversation_id", row.id)
        .eq("deleted_for_everyone", false);

      if (clearedAt) {
        msgQuery = msgQuery.gt("created_at", clearedAt);
      }

      const { data: lastMsgs } = await msgQuery
        .order("created_at", { ascending: false })
        .limit(1);

      const last = lastMsgs?.[0];
      const last_message = last
        ? last.body ?? (last.attachment_type === "image" ? "📷 Image" : "📎 File")
        : null;

      let senderMsgsQuery = db()
        .from("messages")
        .select("id")
        .eq("conversation_id", row.id)
        .eq("sender_id", otherId)
        .eq("deleted_for_everyone", false);

      if (clearedAt) {
        senderMsgsQuery = senderMsgsQuery.gt("created_at", clearedAt);
      }

      const { data: senderMsgs } = await senderMsgsQuery;
      const senderMsgIds = senderMsgs?.map((m: any) => m.id) ?? [];

      let unread = 0;
      if (senderMsgIds.length > 0) {
        const { data: readReceipts } = await db()
          .from("message_reads")
          .select("message_id")
          .eq("user_id", myId)
          .in("message_id", senderMsgIds);

        const readMsgIds = new Set((readReceipts ?? []).map((r: any) => r.message_id));
        unread = senderMsgIds.filter((id: string) => !readMsgIds.has(id)).length;
      }

      return {
        id: row.id,
        participant_a: row.participant_a,
        participant_b: row.participant_b,
        other_user,
        last_message,
        last_message_at: row.last_message_at,
        unread_count: unread ?? 0,
        created_at: row.created_at,
      };
    })
  );

  return results;
}

// ─────────────────────────────────────────────
// Message helpers
// ─────────────────────────────────────────────

const PAGE_SIZE = 40;

export async function getMessages(
  conversationId: string,
  myId: string,
  before?: string
): Promise<ChatMessage[]> {
  // Fetch cleared_at timestamp
  const { data: conv } = await db()
    .from("conversations")
    .select("participant_a, participant_b, cleared_at_a, cleared_at_b")
    .eq("id", conversationId)
    .single();

  let clearedAt = null;
  if (conv) {
    if (conv.participant_a === myId) clearedAt = conv.cleared_at_a;
    else if (conv.participant_b === myId) clearedAt = conv.cleared_at_b;
  }

  let query = db()
    .from("messages")
    .select(
      `id, conversation_id, sender_id, body,
       attachment_url, attachment_type, attachment_name, attachment_size,
       reply_to_id, is_edited, edited_at,
       deleted_for_sender, deleted_for_everyone, created_at`
    )
    .eq("conversation_id", conversationId)
    .eq("deleted_for_everyone", false);

  if (before) query = query.lt("created_at", before);
  if (clearedAt) query = query.gt("created_at", clearedAt);

  const { data: rows, error } = await query
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) throw error;
  if (!rows?.length) return [];


  const ids = (rows as any[]).map((r: any) => r.id);

  const { data: reactions } = await db()
    .from("message_reactions")
    .select("message_id, emoji, user_id")
    .in("message_id", ids);

  const { data: reads } = await db()
    .from("message_reads")
    .select("message_id, user_id, read_at")
    .in("message_id", ids);

  const reactionMap = new Map<string, MessageReaction[]>();
  for (const r of (reactions as any[]) ?? []) {
    if (!reactionMap.has(r.message_id)) reactionMap.set(r.message_id, []);
    const existing = reactionMap.get(r.message_id)!;
    const group = existing.find((g) => g.emoji === r.emoji);
    if (group) { group.users.push(r.user_id); group.count++; }
    else existing.push({ emoji: r.emoji, users: [r.user_id], count: 1 });
  }

  const readMap = new Map<string, { user_id: string; read_at: string }[]>();
  for (const rd of (reads as any[]) ?? []) {
    if (!readMap.has(rd.message_id)) readMap.set(rd.message_id, []);
    readMap.get(rd.message_id)!.push({ user_id: rd.user_id, read_at: rd.read_at });
  }

  const replyIds = [
    ...new Set((rows as any[]).map((r: any) => r.reply_to_id).filter(Boolean)),
  ] as string[];
  const replyMap = new Map<string, ChatMessage>();
  if (replyIds.length) {
    const { data: parents } = await db()
      .from("messages")
      .select("id, sender_id, body, attachment_type, created_at")
      .in("id", replyIds);
    for (const p of (parents as any[]) ?? []) {
      replyMap.set(p.id, {
        id: p.id, conversation_id: conversationId, sender_id: p.sender_id,
        body: p.body,
        attachment: p.attachment_type
          ? { url: "", type: p.attachment_type as "image" | "file", name: "" }
          : null,
        reply_to: null, reply_to_id: null, reactions: [], reads: [],
        is_edited: false, edited_at: null, deleted_for_sender: false,
        deleted_for_everyone: false, created_at: p.created_at,
      });
    }
  }

  return (rows as any[]).map((row: any) => {
    const isDeleted = row.deleted_for_everyone || (row.deleted_for_sender && row.sender_id === myId);
    return {
      id: row.id, conversation_id: row.conversation_id, sender_id: row.sender_id,
      body: isDeleted ? null : row.body,
      attachment: isDeleted ? null : row.attachment_url ? {
        url: row.attachment_url, type: row.attachment_type as "image" | "file",
        name: row.attachment_name ?? "attachment", size: row.attachment_size ?? undefined,
      } : null,
      reply_to: row.reply_to_id ? (replyMap.get(row.reply_to_id) ?? null) : null,
      reply_to_id: row.reply_to_id ?? null,
      reactions: reactionMap.get(row.id) ?? [],
      reads: readMap.get(row.id) ?? [],
      is_edited: row.is_edited, edited_at: row.edited_at ?? null,
      deleted_for_sender: row.deleted_for_sender,
      deleted_for_everyone: row.deleted_for_everyone,
      created_at: row.created_at, isMine: row.sender_id === myId,
    };
  });
}

export async function sendMessage(payload: {
  conversationId: string; senderId: string; body?: string;
  attachment?: { url: string; type: "image" | "file"; name: string; size: number };
  replyToId?: string;
}): Promise<ChatMessage> {
  const { data, error } = await db()
    .from("messages")
    .insert({
      conversation_id: payload.conversationId, sender_id: payload.senderId,
      body: payload.body ?? null, attachment_url: payload.attachment?.url ?? null,
      attachment_type: payload.attachment?.type ?? null,
      attachment_name: payload.attachment?.name ?? null,
      attachment_size: payload.attachment?.size ?? null,
      reply_to_id: payload.replyToId ?? null,
    })
    .select().single();
  if (error) throw error;
  return {
    id: data.id, conversation_id: data.conversation_id, sender_id: data.sender_id,
    body: data.body,
    attachment: data.attachment_url ? {
      url: data.attachment_url, type: data.attachment_type as "image" | "file",
      name: data.attachment_name ?? "attachment", size: data.attachment_size ?? undefined,
    } : null,
    reply_to: null, reply_to_id: data.reply_to_id ?? null,
    reactions: [], reads: [], is_edited: data.is_edited, edited_at: null,
    deleted_for_sender: data.deleted_for_sender, deleted_for_everyone: data.deleted_for_everyone,
    created_at: data.created_at, isMine: true,
  };
}

export async function editMessage(messageId: string, newBody: string): Promise<void> {
  const { error } = await db()
    .from("messages")
    .update({ body: newBody, is_edited: true, edited_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

export async function deleteMessage(messageId: string, mode: MessageDeleteMode): Promise<void> {
  const update = mode === "for_everyone" ? { deleted_for_everyone: true } : { deleted_for_sender: true };
  const { error } = await db().from("messages").update(update).eq("id", messageId);
  if (error) throw error;
}

export async function toggleReaction(
  messageId: string, userId: string, emoji: string, hasReacted: boolean
): Promise<void> {
  if (hasReacted) {
    await db().from("message_reactions").delete()
      .eq("message_id", messageId).eq("user_id", userId).eq("emoji", emoji);
  } else {
    await db().from("message_reactions").insert({ message_id: messageId, user_id: userId, emoji });
  }
}

export async function markConversationRead(conversationId: string, myId: string): Promise<void> {
  const { data: unread } = await db().from("messages").select("id")
    .eq("conversation_id", conversationId).neq("sender_id", myId).eq("deleted_for_everyone", false);
  if (!(unread as any[])?.length) return;

  const { data: alreadyRead } = await db().from("message_reads").select("message_id")
    .eq("user_id", myId).in("message_id", (unread as any[]).map((m: any) => m.id));

  const alreadyReadIds = new Set(((alreadyRead as any[]) ?? []).map((r: any) => r.message_id));
  const toMark = (unread as any[]).filter((m: any) => !alreadyReadIds.has(m.id));
  if (!toMark.length) return;

  await db().from("message_reads").insert(toMark.map((m: any) => ({ message_id: m.id, user_id: myId })));
}

export async function searchMessages(conversationId: string, query: string): Promise<ChatMessage[]> {
  const { data, error } = await db().from("messages").select("*")
    .eq("conversation_id", conversationId).eq("deleted_for_everyone", false)
    .ilike("body", `%${query}%`).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return ((data as any[]) ?? []).map((row: any) => ({
    id: row.id, conversation_id: row.conversation_id, sender_id: row.sender_id, body: row.body,
    attachment: row.attachment_url ? {
      url: row.attachment_url, type: row.attachment_type as "image" | "file",
      name: row.attachment_name ?? "attachment",
    } : null,
    reply_to: null, reply_to_id: row.reply_to_id ?? null, reactions: [], reads: [],
    is_edited: row.is_edited, edited_at: row.edited_at ?? null,
    deleted_for_sender: row.deleted_for_sender, deleted_for_everyone: row.deleted_for_everyone,
    created_at: row.created_at, isMine: false,
  }));
}

export async function searchChatableUsers(
  query: string,
  roles: Array<"patient" | "doctor" | "admin" | "super_admin">
): Promise<ChatParticipant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles").select("id, full_name, avatar_url, role")
    .in("role", roles).ilike("full_name", `%${query}%`).eq("is_active", true).limit(20);
  if (error) throw error;
  return (data ?? []) as ChatParticipant[];
}

export async function clearConversation(conversationId: string, myId: string): Promise<void> {
  const { data: conv, error: getErr } = await db()
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .single();

  if (getErr || !conv) throw getErr || new Error("Conversation not found");

  const now = new Date().toISOString();
  if (conv.participant_a === myId) {
    const { error } = await db()
      .from("conversations")
      .update({ cleared_at_a: now })
      .eq("id", conversationId);
    if (error) throw error;
  } else {
    const { error } = await db()
      .from("conversations")
      .update({ cleared_at_b: now })
      .eq("id", conversationId);
    if (error) throw error;
  }
}

export async function deleteConversation(conversationId: string, myId: string): Promise<void> {
  const { data: conv, error: getErr } = await db()
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .single();

  if (getErr || !conv) throw getErr || new Error("Conversation not found");

  const now = new Date().toISOString();
  if (conv.participant_a === myId) {
    const { error } = await db()
      .from("conversations")
      .update({ 
        deleted_by_a: true,
        cleared_at_a: now 
      })
      .eq("id", conversationId);
    if (error) throw error;
  } else {
    const { error } = await db()
      .from("conversations")
      .update({ 
        deleted_by_b: true,
        cleared_at_b: now 
      })
      .eq("id", conversationId);
    if (error) throw error;
  }
}

