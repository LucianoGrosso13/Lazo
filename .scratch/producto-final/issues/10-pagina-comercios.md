# 10: Página para comercios — tramos, mostrador real y copy profesional

**What to build:** `/para-comercios` explica la oferta decidida:
- **Cuánto y cuándo cobra:** tabla hoy / 30 / 60 / 90 con comisión, tramos y el ejemplo de 1.000.
- **Por qué es seguro:** compromiso registrado en la cadena; Lazo garantiza cada tramo aunque el cliente se atrase.
- **Cómo vende en mostrador:** el flujo del QR, ya disponible, con CTA a `/app/comercio/mostrador`.
- **Online:** link del marketplace.

Sin "provisional", "roadmap" ni "Qué es demo y qué no" en esta página: remite a la sección del home "Qué corre en la cadena y qué en el simulador".

**Blocked by:** 01

**Status:** done

**Archivos propios:** `app/src/components/audience/para-comercios.tsx`, `app/src/i18n/dictionaries/para-comercios.ts`, `app/src/app/para-comercios/page.tsx` (metadata).

Notas:
- Números desde `settlementOptionsOf`, `payoutSchedule` y `quote()`; comparación contra la competencia con `REFERENCE_FIGURES`, sin marcas.
- FAQ existentes: actualizar las respuestas (el QR **ya** existe; cobro en tramos; pesos = integración futura con billeteras argentinas). No agregar preguntas nuevas.
- El riesgo se cuenta en serio: el fiador puede rechazar el cargo, pero el tramo del comercio lo garantiza Lazo.

- [x] Tabla de plazos con tramos desde la config
- [x] Sección de mostrador como función disponible, con CTA
- [x] Cero "provisional", "roadmap" o "demo" sueltos (es y en)
- [x] 390/1440; capturas `evidence/10-*`
- [ ] typecheck / lint / test / build en verde (typecheck, lint y build pasan; Vitest ejecutó 272 tests pero terminó con un error de worker por incompatibilidad ESM de dependencias)
