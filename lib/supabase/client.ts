import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseKey, getSupabaseUrl } from "./env";

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseKey());
}
