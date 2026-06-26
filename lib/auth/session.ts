import { createClient } from "@/lib/supabase/client";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
