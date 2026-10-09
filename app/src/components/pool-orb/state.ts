import type { Pool } from "@/lib/cuotas";

export type OrbState = { disponibleRatio: number; prestadoRatio: number; intensidad: number };

/** Shares of operational assets, not NAV (which also includes accrued fees).
 * Brightness uses a logarithmic visual scale in whole USDC: monotonic, bounded,
 * and independent of any business target or invented liquidity threshold. */
export function poolToOrbState(pool: Pick<Pool, "available" | "outstandingCredit">): OrbState {
  const safe = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const disponible = safe(pool.available);
  const prestado = safe(pool.outstandingCredit);
  const total = disponible + prestado;
  const light = Math.log1p(total / 1_000_000);
  return {
    disponibleRatio: total > 0 ? disponible / total : 0,
    prestadoRatio: total > 0 ? prestado / total : 0,
    intensidad: light / (1 + light),
  };
}
