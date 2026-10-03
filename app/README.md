# Lazo · app

Front de Lazo (Next.js App Router). Corre en **devnet**.

```bash
npm install
cp .env.example .env.local
npm run dev
npm test
```

Las pantallas hablan con la cadena solo a través de `src/lib/cuotas.ts` (mock por defecto, real con `NEXT_PUBLIC_CUOTAS_MODE=real`).
