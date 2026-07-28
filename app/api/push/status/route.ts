import { NextResponse } from "next/server";

/**
 * Lightweight check that VAPID env is present on the server (no secrets leaked).
 * Used to diagnose "keys set in Vercel but client still fails" (usually needs redeploy).
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim().replace(
    /^["']|["']$/g,
    ""
  );
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim().replace(
    /^["']|["']$/g,
    ""
  );
  const subject = process.env.VAPID_SUBJECT?.trim() || null;
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  return NextResponse.json({
    configured: Boolean(publicKey && privateKey),
    hasPublicKey: Boolean(publicKey),
    hasPrivateKey: Boolean(privateKey),
    hasSubject: Boolean(subject),
    hasServiceRole: serviceRole,
    // Prefix only — confirms which public key the *server build* sees
    publicKeyPrefix: publicKey ? publicKey.slice(0, 12) : null,
    publicKeyLength: publicKey?.length ?? 0,
  });
}
