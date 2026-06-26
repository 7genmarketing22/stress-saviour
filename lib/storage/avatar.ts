import { createClient } from "@/lib/supabase/client";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please upload a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be smaller than 2MB.";
  }
  return null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatar(userId: string): Promise<void> {
  const supabase = createClient();
  const { data: files } = await supabase.storage.from(BUCKET).list(userId);
  if (!files?.length) return;

  const paths = files.map((file) => `${userId}/${file.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
}
