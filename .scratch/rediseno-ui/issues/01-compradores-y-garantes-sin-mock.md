# 01: Barrido de texto — compradores y garantes, sin "Mock"

**What to build:** en todo el texto visible en español, "estudiante/s" pasa a "comprador/es" y "fiador/es" a "garante/s" (incluidos menú, títulos, checkout, cuentas, FAQs, landing, páginas "Cómo funciona"). En inglés, "student/s" pasa a "buyer/s" donde nombra al rol ("guarantor" queda). El menú y la página de audiencia dicen "Compradores y garantes" / "Buyers and guarantors". Las personas demo pasan a "Comprador nuevo", "Comprador Tier 4" y "Garante". Ninguna cuenta (admin, pool, comprador, comercio, garante, `/account`, selector de identidad) muestra "Datos simulados", "Simulated data" ni "Mock".

**Blocked by:** None (can start immediately)

**Status:** done · **Asignado:** Claude (coordinador)

**Archivos propios:** todos los diccionarios de `app/src/i18n/dictionaries/` (solo valores de texto, salvo `landing-equipo.ts`, que no se toca), los usos de los rótulos de simulación en `components/cuenta/*` (solo borrar el rótulo) y los e2e que buscan esos textos. Rutas, claves, componentes y tipos no cambian.

- [x] Ningún "estudiante" ni "fiador" en texto visible en español (grep en los diccionarios y en el HTML de cada ruta)
- [x] Menú y título de la página: "Compradores y garantes"
- [x] Sin "Datos simulados", "Simulated data" ni "Mock" en las cuentas; se mantienen la sección honesta de la landing, el footer de devnet y "de ejemplo" del marketplace
- [x] e2e actualizados y en verde; typecheck, lint, test y build en verde
