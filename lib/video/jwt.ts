import { createHmac, createSign } from "node:crypto";

/**
 * Jitsi video-consultation token helpers.
 *
 * Supported deployments (checked in order):
 * 1. JaaS / 8x8.vc  — set JITSI_DOMAIN=8x8.vc, JITSI_APP_ID, JITSI_KID and
 *    JITSI_PRIVATE_KEY (RS256). Rooms are namespaced as "{appId}/{room}".
 * 2. Self-hosted Jitsi with prosody token auth (enableUserRolesBasedOnToken)
 *    — set JITSI_DOMAIN, JITSI_APP_ID and JITSI_APP_SECRET (HS256).
 * 3. Anonymous instance (default meet.jit.si) — no JWT is issued. Role
 *    separation is then enforced only by our own join flow (doctor must
 *    start the session before the patient's client will enter the room).
 */

const DEFAULT_DOMAIN = "meet.jit.si";

export function getJitsiDomain(): string {
  const raw =
    process.env.JITSI_DOMAIN ||
    process.env.NEXT_PUBLIC_JITSI_DOMAIN ||
    DEFAULT_DOMAIN;
  return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * Deterministic, non-guessable room name for an appointment.
 * HMAC keyed with a server secret so nobody can derive it from the id alone.
 */
export function buildRoomName(appointmentId: string): string {
  const secret =
    process.env.JITSI_ROOM_SECRET ||
    process.env.JITSI_APP_SECRET ||
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // Full UUID still carries ~122 bits of entropy — unguessable on its own.
    return `ss-${appointmentId}`;
  }
  const digest = createHmac("sha256", secret)
    .update(appointmentId)
    .digest("hex");
  return `ss-${appointmentId.slice(0, 8)}-${digest.slice(0, 20)}`;
}

/** JaaS rooms must be prefixed with the app id in the URL/room claim. */
export function buildRoomPath(room: string): string {
  const appId = process.env.JITSI_APP_ID;
  if (process.env.JITSI_KID && appId) return `${appId}/${room}`;
  return room;
}

export function isJitsiJwtConfigured(): boolean {
  return Boolean(
    (process.env.JITSI_KID &&
      process.env.JITSI_PRIVATE_KEY &&
      process.env.JITSI_APP_ID) ||
      process.env.JITSI_APP_SECRET
  );
}

export interface JitsiTokenInput {
  room: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  moderator: boolean;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * Signs a Jitsi JWT so the moderator/participant role is decided server-side
 * and neither party ever sees a Jitsi login prompt.
 * Returns null when no signing material is configured (anonymous instance).
 */
export function signJitsiJwt(input: JitsiTokenInput): string | null {
  const appId = process.env.JITSI_APP_ID;
  const kid = process.env.JITSI_KID;
  const privateKey = process.env.JITSI_PRIVATE_KEY;
  const appSecret = process.env.JITSI_APP_SECRET;
  const nbf = Math.floor(Date.now() / 1000) - 10;

  const user = {
    name: input.displayName,
    ...(input.email ? { email: input.email } : {}),
    ...(input.avatarUrl ? { avatar: input.avatarUrl } : {}),
    moderator: input.moderator,
  };

  if (kid && privateKey && appId) {
    const header = { alg: "RS256", typ: "JWT", kid };
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: input.room,
      nbf,
      exp: input.expiresAt,
      context: {
        user,
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "outbound-call": false,
        },
      },
    };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const signature = createSign("RSA-SHA256")
      .update(signingInput)
      // Env vars often store the PEM with literal "\n" sequences.
      .sign(privateKey.replace(/\\n/g, "\n"));
    return `${signingInput}.${b64url(signature)}`;
  }

  if (appSecret) {
    const iss = appId || "jitsi";
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      aud: appId || "jitsi",
      iss,
      sub: getJitsiDomain(),
      room: input.room,
      nbf,
      exp: input.expiresAt,
      context: { user },
    };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const signature = createHmac("sha256", appSecret)
      .update(signingInput)
      .digest();
    return `${signingInput}.${b64url(signature)}`;
  }

  return null;
}
