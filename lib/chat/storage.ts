import { createClient } from "@/lib/supabase/client";

const BUCKET = "chat-attachments";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_SIZE) return "File must be smaller than 20 MB.";
  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !ALLOWED_FILE_TYPES.has(file.type)) {
    return "Unsupported file type. Allowed: images, PDF, Word, plain text.";
  }
  return null;
}

export async function uploadChatAttachment(
  conversationId: string,
  senderId: string,
  file: File
): Promise<{ url: string; type: "image" | "file"; name: string; size: number }> {
  const validationError = validateAttachment(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${senderId}/${conversationId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // For private buckets we use a signed URL instead
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7-day signed URL

  if (signErr) throw signErr;

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);

  return {
    url: signed?.signedUrl ?? data.publicUrl,
    type: isImage ? "image" : "file",
    name: file.name,
    size: file.size,
  };
}

/** Generate a fresh signed URL for an existing attachment path. */
export async function refreshAttachmentUrl(path: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) throw error;
  return data.signedUrl;
}
