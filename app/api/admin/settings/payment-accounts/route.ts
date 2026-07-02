import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/staff-server";

export interface PaymentAccount {
  id: string;
  method: string;
  account_title: string;
  account_number: string;
  bank_name: string | null;
  iban: string | null;
  instructions: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = (await request.json()) as Partial<PaymentAccount>;
  if (!body.method?.trim() || !body.account_title?.trim() || !body.account_number?.trim()) {
    return NextResponse.json({ error: "Method, account title, and account number are required." }, { status: 400 });
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .insert({
      method: body.method.trim(),
      account_title: body.account_title.trim(),
      account_number: body.account_number.trim(),
      bank_name: body.bank_name?.trim() || null,
      iban: body.iban?.trim() || null,
      instructions: body.instructions?.trim() || null,
      is_active: body.is_active ?? true,
      display_order: body.display_order ?? 0,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data }, { status: 201 });
}
