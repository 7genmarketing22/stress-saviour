import { createClient } from "@/lib/supabase/client";

/** Clear the Supabase session in the browser (and all devices when scope is global). */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw error;
}

/** Also clear auth cookies on the server so middleware sees the logout immediately. */
async function signOutOnServer() {
  try {
    await fetch("/auth/signout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // Client sign-out still proceeds; hard redirect will re-check auth.
  }
}

/**
 * Full logout: invalidate session everywhere, clear server cookies, then hard-redirect.
 * Uses a full page navigation so dashboard contexts/realtime channels reset instantly.
 */
export async function logout(redirectTo = "/login") {
  const supabase = createClient();
  await supabase.auth.signOut({ scope: "global" });
  await signOutOnServer();

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
