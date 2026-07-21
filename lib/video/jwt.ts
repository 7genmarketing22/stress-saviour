import { createHmac, randomUUID } from "node:crypto";

/**
 * Jitsi video-consultation token helpers.
 *
 * Production uses free self-hosted Jitsi with Prosody token auth. Set
 * JITSI_DOMAIN, JITSI_APP_ID, and JITSI_APP_SECRET (HS256). Anonymous
 * meet.jit.si is retained only as a local fallback and the join API fails
 * closed unless the self-hosted deployment is configured.
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

export function buildRoomPath(room: string): string {
  return room;
}

export function isJitsiJwtConfigured(): boolean {
  return Boolean(process.env.JITSI_APP_ID && process.env.JITSI_APP_SECRET);
}

/** Production-safe free deployment: custom domain + Prosody HS256 secret. */
export function isSelfHostedJitsiConfigured(): boolean {
  const domain = getJitsiDomain();
  return Boolean(
    domain !== DEFAULT_DOMAIN &&
      process.env.JITSI_APP_ID &&
      process.env.JITSI_APP_SECRET
  );
}

export interface JitsiTokenInput {
  room: string;
  userId: string;
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
  const appSecret = process.env.JITSI_APP_SECRET;
  const iat = Math.floor(Date.now() / 1000);
  const nbf = iat - 10;

  const user = {
    id: input.userId,
    name: input.displayName,
    ...(input.email ? { email: input.email } : {}),
    ...(input.avatarUrl ? { avatar: input.avatarUrl } : {}),
    moderator: input.moderator,
    // Read by the self-hosted Prosody token_affiliation plugin.
    affiliation: input.moderator ? "owner" : "member",
  };

  if (appSecret && appId) {
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      aud: appId,
      iss: appId,
      sub: getJitsiDomain(),
      room: input.room,
      jti: randomUUID(),
      iat,
      nbf,
      exp: input.expiresAt,
      moderator: input.moderator,
      context: {
        user,
        moderator: input.moderator,
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "outbound-call": false,
        },
      },
    };
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const signature = createHmac("sha256", appSecret)
      .update(signingInput)
      .digest();
    return `${signingInput}.${b64url(signature)}`;
  }

  return null;
}
