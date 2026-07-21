import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
  isSelfHostedJitsiConfigured,
  signJitsiJwt,
} from "./jwt.ts";

const original = {
  domain: process.env.JITSI_DOMAIN,
  appId: process.env.JITSI_APP_ID,
  appSecret: process.env.JITSI_APP_SECRET,
};

before(() => {
  process.env.JITSI_DOMAIN = "meet.example.com";
  process.env.JITSI_APP_ID = "stress-saviour";
  process.env.JITSI_APP_SECRET = "test-secret-that-is-long-enough-for-hs256";
});

after(() => {
  if (original.domain === undefined) delete process.env.JITSI_DOMAIN;
  else process.env.JITSI_DOMAIN = original.domain;
  if (original.appId === undefined) delete process.env.JITSI_APP_ID;
  else process.env.JITSI_APP_ID = original.appId;
  if (original.appSecret === undefined) delete process.env.JITSI_APP_SECRET;
  else process.env.JITSI_APP_SECRET = original.appSecret;
});

describe("self-hosted Jitsi JWT", () => {
  it("detects a complete self-hosted configuration", () => {
    assert.equal(isSelfHostedJitsiConfigured(), true);
  });

  it("signs doctor identity, room, role, and expiry with HS256", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 900;
    const token = signJitsiJwt({
      room: "ss-test-room",
      userId: "doctor-id",
      displayName: "Dr. Test",
      email: "doctor@example.com",
      moderator: true,
      expiresAt,
    });

    assert.ok(token);
    const [headerPart, payloadPart, signature] = token.split(".");
    const header = JSON.parse(
      Buffer.from(headerPart, "base64url").toString("utf8")
    );
    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    );
    const expectedSignature = createHmac(
      "sha256",
      process.env.JITSI_APP_SECRET!
    )
      .update(`${headerPart}.${payloadPart}`)
      .digest("base64url");

    assert.equal(header.alg, "HS256");
    assert.equal(payload.aud, "stress-saviour");
    assert.equal(payload.iss, "stress-saviour");
    assert.equal(payload.sub, "meet.example.com");
    assert.equal(payload.room, "ss-test-room");
    assert.equal(payload.exp, expiresAt);
    assert.equal(payload.moderator, true);
    assert.equal(payload.context.user.id, "doctor-id");
    assert.equal(payload.context.user.moderator, true);
    assert.equal(payload.context.user.affiliation, "owner");
    assert.ok(payload.jti);
    assert.equal(signature, expectedSignature);
  });
});
