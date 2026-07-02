import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/staff-server";
import type { PaymentAccount } from "../route";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await context.params;
  const body = (await request.json()) as Partial<PaymentAccount>;

  const updates: Record<string, unknown> = {};
  if (body.method !== undefined) updates.method = body.method;
  if (body.account_title !== undefined) updates.account_title = body.account_title;
  if (body.account_number !== undefined) updates.account_number = body.account_number;
  if (body.bank_name !== undefined) updates.bank_name = body.bank_name;
  if (body.iban !== undefined) updates.iban = body.iban;
  if (body.instructions !== undefined) updates.instructions = body.instructions;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const { id } = await context.params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("payment_accounts")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
