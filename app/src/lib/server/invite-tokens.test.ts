import { describe, expect, it } from "vitest";
import {
  InviteTokenError,
  isServerToken,
  signInvitation,
  verifyInvitation,
} from "./invite-tokens";

const SECRET = "test-secret-that-is-long-enough-12345678";
const OTHER_SECRET = "a-different-secret-00000000000000000000";
const STUDENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";
const NOW = 1_800_000_000;

describe("invite tokens", () => {
  it("round-trips a token bound to the student", () => {
    const { token, issuedAt, expiresAt } = signInvitation(STUDENT, { now: NOW, ttlSeconds: 3600, secret: SECRET });
    expect(isServerToken(token)).toBe(true);
    expect(isServerToken("abcdef0123456789")).toBe(false);
    const v = verifyInvitation(token, { now: NOW + 10, secret: SECRET });
    expect(v.student).toBe(STUDENT);
    expect(v.issuedAt).toBe(issuedAt);
    expect(v.expiresAt).toBe(expiresAt);
    expect(expiresAt - issuedAt).toBe(3600);
  });

  it("rejects tampered payloads and signatures", () => {
    const { token } = signInvitation(STUDENT, { now: NOW, secret: SECRET });
    const [p, payload, sig] = token.split(".");
    // Flip a MIDDLE char (the last base64 char may carry padding bits only,
    // which decoders ignore — flipping it would not always change the bytes).
    const flipAt = (s: string, i: number): string => `${s.slice(0, i)}${s[i] === "A" ? "B" : "A"}${s.slice(i + 1)}`;
    const tampered = `${p}.${flipAt(payload, 10)}.${sig}`;
    expect(() => verifyInvitation(tampered, { now: NOW, secret: SECRET })).toThrowError(InviteTokenError);
    const badSig = `${p}.${payload}.${flipAt(sig, 10)}`;
    expect(() => verifyInvitation(badSig, { now: NOW, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "bad_signature" }),
    );
  });

  it("rejects tokens signed with another secret", () => {
    const { token } = signInvitation(STUDENT, { now: NOW, secret: OTHER_SECRET });
    expect(() => verifyInvitation(token, { now: NOW, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "bad_signature" }),
    );
  });

  it("enforces expiry and future-issued tokens", () => {
    const { token } = signInvitation(STUDENT, { now: NOW, ttlSeconds: 60, secret: SECRET });
    expect(() => verifyInvitation(token, { now: NOW + 61, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "expired" }),
    );
    expect(verifyInvitation(token, { now: NOW + 59, secret: SECRET }).student).toBe(STUDENT);
    expect(() => verifyInvitation(token, { now: NOW - 3600, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "not_yet_valid" }),
    );
  });

  it("rejects malformed tokens and bad students", () => {
    // "bnVsbA" is base64url("null"): a JSON null payload must be invalid_format, not a crash.
    const nullPayload = `v1.bnVsbA.${Buffer.from("x".repeat(32)).toString("base64url")}`;
    for (const bad of ["", "v1", "v1.abc", "v1.abc.def.ghi", "v2.e30.e30", "not-a-token", nullPayload]) {
      expect(() => verifyInvitation(bad, { now: NOW, secret: SECRET })).toThrowError(
        expect.objectContaining({ code: "invalid_format" }),
      );
    }
    expect(() => signInvitation("not a wallet!!", { now: NOW, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "bad_student" }),
    );
    expect(() => signInvitation("0OIl" + "a".repeat(40), { now: NOW, secret: SECRET })).toThrowError(
      expect.objectContaining({ code: "bad_student" }),
    );
  });

  it("fails closed without a secret", () => {
    const saved = process.env.FIADOR_INVITE_SECRET;
    delete process.env.FIADOR_INVITE_SECRET;
    try {
      expect(() => signInvitation(STUDENT, { now: NOW })).toThrowError(
        expect.objectContaining({ code: "missing_secret" }),
      );
      const { token } = signInvitation(STUDENT, { now: NOW, secret: SECRET });
      expect(() => verifyInvitation(token, { now: NOW })).toThrowError(
        expect.objectContaining({ code: "missing_secret" }),
      );
    } finally {
      if (saved !== undefined) process.env.FIADOR_INVITE_SECRET = saved;
    }
  });
});
