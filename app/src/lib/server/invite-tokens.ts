// HMAC invitation tokens: stateless, bound to one student, with TTL.
// The token IS the credential (no wallet on the guarantor side), so it works
// cross-browser: any browser that presents a valid token resolves the same
// invitation. Completion state lives in the server store, keyed by token hash.
//
// Format: v1.<base64url(payload)>.<base64url(sig)>
//   payload = {"v":1,"student":...,"iat":...,"exp":...,"nonce":...}
//   sig = HMAC-SHA256(secret, "lazo-fiador-invite.v1." + payloadB64)
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { invitationTtlSeconds, inviteSecret } from "./env";

const PREFIX = "v1";
const SIG_CONTEXT = "lazo-fiador-invite.v1.";

/** Base58 wallet charset, 32-44 chars. Structural check, not on-chain existence. */
const ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type InviteTokenCode =
  | "invalid_format"
  | "bad_signature"
  | "expired"
  | "not_yet_valid"
  | "bad_student"
  | "missing_secret";

export class InviteTokenError extends Error {
  constructor(
    public readonly code: InviteTokenCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "InviteTokenError";
  }
}

export interface VerifiedInvitation {
  student: string;
  issuedAt: number;
  expiresAt: number;
  /** Random per-token id for store keys (never the secret). */
  nonce: string;
}

const b64uEncode = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64url");
const b64uDecode = (s: string): Buffer => Buffer.from(s, "base64url");

function signPayload(payloadB64: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(SIG_CONTEXT + payloadB64).digest();
}

/** Distinguishes server (HMAC) tokens from legacy mock tokens (plain hex). */
export function isServerToken(token: string): boolean {
  return token.startsWith(`${PREFIX}.`);
}

export function signInvitation(
  student: string,
  opts?: { now?: number; ttlSeconds?: number; secret?: string },
): { token: string; issuedAt: number; expiresAt: number } {
  if (!ADDRESS_RE.test(student)) {
    throw new InviteTokenError("bad_student", "bad_student: not a base58 wallet address");
  }
  let secret: string;
  try {
    secret = opts?.secret ?? inviteSecret();
  } catch {
    throw new InviteTokenError("missing_secret", "missing_secret: FIADOR_INVITE_SECRET is not configured");
  }
  const issuedAt = opts?.now ?? Math.floor(Date.now() / 1000);
  const ttl = opts?.ttlSeconds ?? invitationTtlSeconds();
  const payload = {
    v: 1,
    student,
    iat: issuedAt,
    exp: issuedAt + ttl,
    nonce: b64uEncode(randomBytes(16)),
  };
  const payloadB64 = b64uEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const sigB64 = b64uEncode(signPayload(payloadB64, secret));
  return { token: `${PREFIX}.${payloadB64}.${sigB64}`, issuedAt, expiresAt: payload.exp };
}

export function verifyInvitation(
  token: string,
  opts?: { now?: number; secret?: string },
): VerifiedInvitation {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX || !parts[1] || !parts[2]) {
    throw new InviteTokenError("invalid_format", "invalid_format: expected v1.<payload>.<sig>");
  }
  const [, payloadB64, sigB64] = parts;
  let secret: string;
  try {
    secret = opts?.secret ?? inviteSecret();
  } catch {
    throw new InviteTokenError("missing_secret", "missing_secret: FIADOR_INVITE_SECRET is not configured");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(b64uDecode(payloadB64).toString("utf8"));
  } catch {
    throw new InviteTokenError("invalid_format", "invalid_format: payload is not JSON");
  }
  if (typeof payload !== "object" || payload === null) {
    throw new InviteTokenError("invalid_format", "invalid_format: payload is not an object");
  }
  const p = payload as { v?: unknown; student?: unknown; iat?: unknown; exp?: unknown; nonce?: unknown };
  if (
    p.v !== 1 ||
    typeof p.student !== "string" ||
    !ADDRESS_RE.test(p.student) ||
    typeof p.iat !== "number" ||
    typeof p.exp !== "number" ||
    typeof p.nonce !== "string" ||
    !p.nonce
  ) {
    throw new InviteTokenError("invalid_format", "invalid_format: payload fields");
  }
  let sig: Buffer;
  try {
    sig = b64uDecode(sigB64);
  } catch {
    throw new InviteTokenError("invalid_format", "invalid_format: signature is not base64url");
  }
  const expected = signPayload(payloadB64, secret);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new InviteTokenError("bad_signature", "bad_signature: HMAC mismatch");
  }
  const now = opts?.now ?? Math.floor(Date.now() / 1000);
  if (now < p.iat - 60) {
    throw new InviteTokenError("not_yet_valid", "not_yet_valid: token issued in the future");
  }
  if (now >= p.exp) {
    throw new InviteTokenError("expired", "expired: invitation TTL elapsed");
  }
  return { student: p.student, issuedAt: p.iat, expiresAt: p.exp, nonce: p.nonce };
}
