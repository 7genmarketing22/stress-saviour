import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/staff-server";

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = (await request.json()) as {
    full_name?: string;
    phone?: string | null;
    city?: string | null;
    avatar_url?: string | null;
  };

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update({
      ...(body.full_name !== undefined ? { full_name: body.full_name.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.avatar_url !== undefined ? { avatar_url: body.avatar_url } : {}),
    })
    .eq("id", auth.userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
