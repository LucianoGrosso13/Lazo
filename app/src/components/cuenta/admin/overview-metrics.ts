// Métricas del resumen del admin. Función pura: recibe los planes que la API
// de cuotas ya expone y devuelve conteos, volumen y la lista de atención.
// Nada se inventa: cada número sale de `Plan` / `Installment`.
import type { Micro, Plan, WalletAddress } from "@/lib/cuotas";

export type PlanBucket = "ok" | "grace" | "late" | "charged";

export const BUCKETS: PlanBucket[] = ["ok", "grace", "late", "charged"];

export interface AttentionItem {
  planId: string;
  student: WalletAddress;
  bucket: "late" | "charged";
  /** Cuotas vencidas con punitorio (late) o cobradas al garante (charged). */
  amount: Micro;
}

export interface OverviewMetrics {
  /** Planes abiertos, incluidos los saldados. */
  opened: number;
  /** Abiertos sin saldar ni recuperar. */
  active: number;
  /** Suma de lo financiado en todos los planes abiertos. */
  financed: Micro;
  /** Planes sin saldar, por estado. */
  buckets: Record<PlanBucket, number>;
  /** Planes en mora o cobrados al garante. */
  delinquent: number;
  attention: AttentionItem[];
}

/** `null` = plan saldado (no entra en el gráfico). */
export function classifyPlan(plan: Plan): PlanBucket | null {
  if (plan.status === "Settled") return null;
  const st = plan.installments.map((i) => i.status);
  if (plan.status === "Recovered" || st.includes("ChargedToGuarantor")) return "charged";
  if (plan.status === "Late" || st.includes("Late")) return "late";
  if (st.includes("Grace")) return "grace";
  return "ok";
}

export function summarizePlans(plans: Plan[]): OverviewMetrics {
  const buckets: Record<PlanBucket, number> = { ok: 0, grace: 0, late: 0, charged: 0 };
  const attention: AttentionItem[] = [];
  let financed = 0;
  let active = 0;
  for (const plan of plans) {
    financed += plan.financed;
    const bucket = classifyPlan(plan);
    if (bucket === null) continue;
    buckets[bucket] += 1;
    if (plan.status !== "Recovered") active += 1;
    if (bucket === "late" || bucket === "charged") {
      const want = bucket === "late" ? "Late" : "ChargedToGuarantor";
      const amount = plan.installments
        .filter((i) => i.status === want)
        .reduce((s, i) => s + i.amount + (bucket === "late" ? i.penalty : 0), 0);
      attention.push({ planId: plan.id, student: plan.student, bucket, amount });
    }
  }
  // Primero lo que todavía se puede resolver (mora), después lo ya cobrado.
  attention.sort(
    (a, b) =>
      (a.bucket === b.bucket ? 0 : a.bucket === "late" ? -1 : 1) || b.amount - a.amount,
  );
  return {
    opened: plans.length,
    active,
    financed,
    buckets,
    delinquent: buckets.late + buckets.charged,
    attention,
  };
}
