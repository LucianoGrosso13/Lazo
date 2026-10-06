// GET /api/fiador/fianza/cotizar?token=&maxPurchase= — server-side quote for
// the chosen purchase cap. Reads ProtocolConfig + the student's tier from
// the chain (never trusts client numbers) and applies the explicitly
// configured coverage policy (no default; pending until the user decides).
import { coveragePolicyFromEnv, resolveCoverageMax } from "@/lib/server/coverage-policy";
import { getChainConfig, getStudentTier, serverQuoteForCap } from "@/lib/server/chain";
import { apiError, mapError } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { getStore, tokenKey } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  try {
    const params = new URL(req.url).searchParams;
    const token = params.get("token") ?? "";
    const maxPurchase = Number(params.get("maxPurchase"));
    if (!Number.isSafeInteger(maxPurchase) || maxPurchase <= 0) {
      return apiError("bad_request", "bad_request: maxPurchase must be a positive integer (micro-USDC)", 400);
    }
    const verified = verifyInvitation(token);
    if (getStore().read().completions[tokenKey(token)]) {
      return apiError("invitation_completed", "invitation_completed: this invitation already has a guarantee", 409);
    }
    const [config, t] = await Promise.all([getChainConfig(), getStudentTier(verified.student)]);
    const quote = serverQuoteForCap(config, t.tier, maxPurchase);
    const policy = coveragePolicyFromEnv();
    const coverageMax = resolveCoverageMax(
      policy,
      maxPurchase,
      config.guaranteedTiers,
      config.penaltyBps,
    );
    return Response.json({
      tier: quote.tier,
      tierSource: t.source,
      canOpenPlan: t.canOpenPlan,
      maxPurchase,
      downPayment: quote.downPayment,
      financed: quote.financed,
      requiredCoverage: quote.requiredCoverage,
      coverageMax,
      policy,
    });
  } catch (e) {
    return mapError(e);
  }
}
