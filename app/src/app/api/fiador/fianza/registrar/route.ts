// POST /api/fiador/fianza/registrar — verifies an on-chain registration.
// Body: {acceptanceId, signature}. Read-only: it checks the signature is a
// confirmed keeper_register_guarantee for THIS acceptance (program, keeper
// signer, student, args) and only then marks it registered. Idempotent per
// acceptance: re-submitting the same signature returns it without re-verify.
//
// The transaction itself is built, simulated, and sent by the keeper CLI
// after explicit operator approval — no private key ever touches HTTP input.
import { apiError, isRecord, mapError, readJson } from "@/lib/server/http";
import { chainRpc, getChainConfig } from "@/lib/server/chain";
import { getStore } from "@/lib/server/store";
import { verifyGuaranteeRegistration } from "@/lib/server/verify-registration";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    if (!isRecord(body)) return apiError("bad_request", "bad_request: object body required", 400);
    const acceptanceId = typeof body.acceptanceId === "string" ? body.acceptanceId : "";
    const signature = typeof body.signature === "string" ? body.signature : "";
    if (!acceptanceId || !signature) {
      return apiError("bad_request", "bad_request: acceptanceId and signature required", 400);
    }
    const store = getStore();
    const acceptance = store.read().acceptances[acceptanceId] ?? null;
    if (!acceptance) {
      return apiError("not_found", "not_found: unknown acceptance", 404);
    }
    if (acceptance.registeredSignature) {
      return Response.json({ signature: acceptance.registeredSignature, deduped: true });
    }
    const config = await getChainConfig();
    const { rpc, program } = await chainRpc();
    const result = await verifyGuaranteeRegistration(rpc, program, config.keeper, signature, {
      student: acceptance.student,
      maxPurchase: acceptance.maxPurchase,
      coverageMax: acceptance.coverageMax,
      mandateHash: acceptance.mandateHash,
    });
    if (!result.verified) {
      const status = result.reason === "signature_not_found" ? 404 : 422;
      return apiError(result.reason, `${result.reason}: ${result.detail}`, status);
    }
    store.update((d) => {
      const a = d.acceptances[acceptanceId];
      if (a) a.registeredSignature = signature;
    });
    return Response.json({ signature, verified: true });
  } catch (e) {
    return mapError(e);
  }
}
