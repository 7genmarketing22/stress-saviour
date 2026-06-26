import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import type { Database } from "@/types/database";
import { uploadAvatar } from "@/lib/storage/avatar";

export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await (supabase.from("profiles") as any)
    .update(updates as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function uploadAndSetAvatar(
  userId: string,
  file: File
): Promise<Profile> {
  const avatarUrl = await uploadAvatar(userId, file);
  return updateUserProfile(userId, { avatar_url: avatarUrl });
}

export async function clearAvatar(userId: string): Promise<Profile> {
  return updateUserProfile(userId, { avatar_url: null });
}
