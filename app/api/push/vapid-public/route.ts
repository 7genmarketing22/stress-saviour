import { NextResponse } from "next/server";

/**
 * Public VAPID key for the service worker (pushsubscriptionchange resubscribe)
 * when no page is open to supply applicationServerKey.
 */
export async function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(
      /^["']|["']$/g,
      ""
    ) || "";

  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID public key not configured", publicKey: null },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { publicKey },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
