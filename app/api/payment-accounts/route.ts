import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Public endpoint — returns all active platform payment accounts. */
export async function GET() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .select("id, method, account_title, account_number, bank_name, iban, instructions, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ accounts: [] });
  return NextResponse.json({ accounts: data ?? [] });
}
