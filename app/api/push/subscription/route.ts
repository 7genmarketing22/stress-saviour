import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(512),
    auth: z.string().min(8).max(256),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(4096),
});

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  const { endpoint, expirationTime, keys } = parsed.data;
  // Regenerate Database types after applying the migration to remove this cast.
  const admin = createServiceRoleClient() as any;
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expiration_time: expirationTime ?? null,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 1000) || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Unable to save push subscription", error);
    return NextResponse.json({ error: "Unable to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }

  // Regenerate Database types after applying the migration to remove this cast.
  const admin = createServiceRoleClient() as any;
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    console.error("Unable to delete push subscription", error);
    return NextResponse.json({ error: "Unable to delete subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
