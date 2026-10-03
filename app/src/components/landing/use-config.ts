"use client";

import { getCuotas, type ProtocolConfig } from "@/lib/cuotas";
import { DEMO_CONFIG } from "@/lib/cuotas/demo-config";
import { useCuotasQuery } from "@/lib/use-cuotas";

/** Config del protocolo. En modo mock arranca con la config de demo para el primer render. */
export function useProtocolConfig(): ProtocolConfig | undefined {
  const fallback = getCuotas().mode === "mock" ? DEMO_CONFIG : undefined;
  const { data } = useCuotasQuery(["config"], (c) => c.getConfig());
  return data ?? fallback;
}
