// POST /api/fiador/fianza/aceptar — the guarantor's explicit acceptance.
// Body: {token, maxPurchase, guarantorName, kycSessionId, subscriberId}.
// Validates, in order: invite, KYC approved (confirmed via Didit decision),
// card linked (live Mobbex re-query), then recomputes requiredCoverage AND
// coverageMax SERVER-SIDE from chain config + the configured coverage policy
// (client numbers are never trusted; no policy default exists). Builds the
// canonical mandate text + hash, stores the acceptance, and returns a DRY-RUN
// registration proposal. Nothing is signed or sent here.
import { getChainConfig, getStudentTier, serverQuoteForCap } from "@/lib/server/chain";
import { coveragePolicyFromEnv, resolveCoverageMax } from "@/lib/server/coverage-policy";
import { getDiditDecision } from "@/lib/server/didit";
import { apiError, isRecord, mapError, readJson } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { getMobbexSubscriber } from "@/lib/server/mobbex";
import { buildRegisterProposal } from "@/lib/server/registration";
import { getStore, tokenKey } from "@/lib/server/store";
import { buildSuretyAcceptance } from "@/lib/server/surety";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    if (!isRecord(body)) return apiError("bad_request", "bad_request: object body required", 400);
    const token = typeof body.token === "string" ? body.token : "";
    const guarantorName = typeof body.guarantorName === "string" ? body.guarantorName : "";
    const kycSessionId = typeof body.kycSessionId === "string" ? body.kycSessionId : "";
    const subscriberId = typeof body.subscriberId === "string" ? body.subscriberId : "";
    const maxPurchase = typeof body.maxPurchase === "number" ? body.maxPurchase : null;
    if (!token || !guarantorName.trim() || !kycSessionId || !subscriberId) {
      return apiError("bad_request", "bad_request: token, guarantorName, kycSessionId, subscriberId required", 400);
    }
    if (maxPurchase == null || !Number.isSafeInteger(maxPurchase) || maxPurchase <= 0) {
      return apiError("bad_request", "bad_request: maxPurchase must be a positive integer", 400);
    }
    const verified = verifyInvitation(token);
    const key = tokenKey(token);
    const store = getStore();
    if (store.read().completions[key]) {
      return apiError("invitation_completed", "invitation_completed: this invitation already has a guarantee", 409);
    }
    // 1. KYC: bound to this invite and confirmed Approved via the decision API.
    const kyc = store.read().kyc[kycSessionId] ?? null;
    if (!kyc || kyc.tokenKey !== key || kyc.student !== verified.student) {
      return apiError("kyc_not_approved", "kyc_not_approved: no verified identity for this invitation", 422);
    }
    let kycApproved = kyc.approvedConfirmed;
    if (!kycApproved) {
      try {
        kycApproved = (await getDiditDecision(kycSessionId)).approved;
      } catch (e) {
        return mapError(e);
      }
    }
    if (!kycApproved) {
      return apiError("kyc_not_approved", "kyc_not_approved: identity verification is not approved", 422);
    }
    // 2. Card: bound to this invite and live-confirmed on Mobbex.
    const card = store.read().cards[verified.student] ?? null;
    if (!card || card.tokenKey !== key || card.subscriberId !== subscriberId) {
      return apiError("card_not_linked", "card_not_linked: no card session for this invitation", 422);
    }
    let liveCard;
    try {
      liveCard = await getMobbexSubscriber(subscriberId);
    } catch (e) {
      return mapError(e);
    }
    if (!liveCard.linked) {
      return apiError(
        "card_not_linked",
        `card_not_linked: processor reports no saved card (${liveCard.reason ?? "unknown"})`,
        422,
      );
    }
    // 3. Server-side quote + coverage (chain config, configured policy).
    const config = await getChainConfig();
    const t = await getStudentTier(verified.student);
    if (!t.canOpenPlan) {
      return apiError(
        "student_blocked",
        "student_blocked: the student has a guarantor charge on record and cannot open plans",
        422,
      );
    }
    const quote = serverQuoteForCap(config, t.tier, maxPurchase);
    const policy = coveragePolicyFromEnv();
    const coverageMax = resolveCoverageMax(policy, maxPurchase, config.guaranteedTiers, config.penaltyBps);
    // 4. Canonical mandate (throws 422/400 via mapError).
    const acceptedAt = Math.floor(Date.now() / 1000);
    const surety = buildSuretyAcceptance({
      student: verified.student,
      guarantorName,
      maxPurchase,
      coverageMax,
      requiredCoverage: quote.requiredCoverage,
      acceptedAt,
      kycSessionId,
      cardLabel: liveCard.cardLabel,
    });
    store.update((d) => {
      d.acceptances[surety.id] = {
        id: surety.id,
        student: verified.student,
        tokenKey: key,
        maxPurchase,
        coverageMax,
        requiredCoverage: quote.requiredCoverage,
        mandateHash: surety.mandateHash,
        mandateText: surety.text,
        guarantorName: guarantorName.trim(),
        kycSessionId,
        subscriberId,
        cardLabel: liveCard.cardLabel,
        acceptedAt,
        registeredSignature: null,
      };
      d.completions[key] = { student: verified.student, completedAt: acceptedAt, acceptanceId: surety.id };
      const kr = d.kyc[kycSessionId];
      if (kr) {
        kr.approvedConfirmed = true;
        kr.status = "Approved";
        kr.updatedAt = acceptedAt;
      }
      const cr = d.cards[verified.student];
      if (cr) {
        cr.linked = true;
        cr.cardLabel = liveCard.cardLabel;
        cr.updatedAt = acceptedAt;
      }
    });
    return Response.json(
      {
        acceptanceId: surety.id,
        mandateHash: surety.mandateHash,
        mandateText: surety.text,
        requiredCoverage: quote.requiredCoverage,
        coverageMax,
        coveragePolicy: policy,
        tier: quote.tier,
        proposal: buildRegisterProposal({
          student: verified.student,
          maxPurchase,
          coverageMax,
          mandateHash: surety.mandateHash,
          keeper: config.keeper,
          status: "pending_approval",
        }),
      },
      { status: 201 },
    );
  } catch (e) {
    return mapError(e);
  }
}
