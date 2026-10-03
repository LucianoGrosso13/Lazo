"use client";

import { useEffect } from "react";
import useSWR, { type SWRResponse } from "swr";
import { getCuotas, type CuotasClient } from "./cuotas";

/**
 * Lee de `cuotas.ts` con SWR y revalida cuando el cliente avisa un cambio
 * (pago, compra, reloj de demo). `key = null` desactiva la consulta.
 */
export function useCuotasQuery<T>(
  key: readonly unknown[] | null,
  fetcher: (cuotas: CuotasClient) => Promise<T>,
): SWRResponse<T> {
  const cuotas = getCuotas();
  const res = useSWR(key ? ["cuotas", ...key] : null, () => fetcher(cuotas));
  const { mutate } = res;
  useEffect(() => cuotas.subscribe(() => void mutate()), [cuotas, mutate]);
  return res;
}
