import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getErrorMessage } from "@/lib/errors";

/** Lenient schema — mobile Chrome/Firefox payloads vary slightly. */
const subscriptionSchema = z.object({
  endpoint: z
    .string()
    .min(12)
    .max(4096)
    .refine((value) => /^https:\/\//i.test(value), "endpoint must be https"),
  expirationTime: z.union([z.number(), z.null()]).optional(),
  keys: z.object({
    p256dh: z.string().min(10).max(512),
    auth: z.string().min(8).max(256),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().min(12).max(4096),
});

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again, then enable notifications.", code: "unauthorized" },
        { status: 401 }
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = subscriptionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "This device sent an incomplete push subscription. Try again after refreshing the app.",
          code: "invalid",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { endpoint, expirationTime, keys } = parsed.data;
    const row = {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      expiration_time:
        typeof expirationTime === "number" ? Math.trunc(expirationTime) : null,
      user_agent: (request.headers.get("user-agent") ?? "").slice(0, 1000) || null,
      updated_at: new Date().toISOString(),
    };

    // Prefer the signed-in user client (RLS). Fall back to service role if needed.
    let errorMessage: string | null = null;

    {
      const { error } = await (supabase.from("push_subscriptions") as any).upsert(row, {
        onConflict: "endpoint",
      });
      if (!error) {
        return NextResponse.json({ ok: true });
      }
      errorMessage = error.message;
      console.error("User-scoped push subscription upsert failed", error);
    }

    try {
      const admin = createServiceRoleClient();
      const { error } = await (admin.from("push_subscriptions") as any).upsert(row, {
        onConflict: "endpoint",
      });
      if (!error) {
        return NextResponse.json({ ok: true });
      }
      errorMessage = error.message;
      console.error("Service-role push subscription upsert failed", error);
    } catch (adminError) {
      errorMessage = getErrorMessage(adminError, errorMessage ?? "Database unavailable");
      console.error("Service-role client unavailable for push subscription", adminError);
    }

    return NextResponse.json(
      {
        error: errorMessage || "Unable to save subscription",
        code: "db",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Push subscription route crashed", error);
    return NextResponse.json(
      {
        error: getErrorMessage(error, "Unable to save subscription"),
        code: "server",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
    }

    const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid push subscription", code: "invalid" }, { status: 400 });
    }

    const { error } = await (supabase.from("push_subscriptions") as any)
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", parsed.data.endpoint);

    if (error) {
      console.error("Unable to delete push subscription", error);
      try {
        const admin = createServiceRoleClient();
        const { error: adminError } = await (admin.from("push_subscriptions") as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", parsed.data.endpoint);
        if (adminError) {
          return NextResponse.json({ error: adminError.message, code: "db" }, { status: 500 });
        }
      } catch {
        return NextResponse.json({ error: error.message, code: "db" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Unable to delete subscription"), code: "server" },
      { status: 500 }
    );
  }
}
