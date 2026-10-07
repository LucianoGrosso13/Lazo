# 08: Cuenta del comercio — cobro en tramos con calendario y acceso al mostrador

**What to build:** en `/app/comercio` el comercio elige cuándo cobrar (hoy, 30, 60 o 90 días) y ve, para la venta de ejemplo, la comisión, el neto y **el calendario de tramos** (monto y fecha de cada uno). En sus ventas ve cada tramo como liberado o pendiente, con la fecha. Se agrega un acceso destacado a "Venta en mostrador" (`/app/comercio/mostrador`).

**Blocked by:** 01

**Status:** done

**Archivos propios:** `app/src/components/cuenta/comercio.tsx`, `app/src/i18n/dictionaries/comercio-cuenta.ts`, `app/src/app/(cuenta)/app/comercio/page.tsx`. No crees la ruta `mostrador` (es del 09): solo el link.

Notas:
- Opciones y tramos desde `settlementOptionsOf(config)` y `payoutSchedule()` de `terms.ts`. Ejemplo: 1.000 en Tier 1 → hoy 951; 30 días 300 + 656,25 (día 30); 60 días 300 + 329,875 × 2; 90 días 300 + 221,08 × 3.
- Una línea: "El anticipo entra hoy. El resto se libera en tramos en su fecha, aunque el cliente se atrase: Lazo lo garantiza". Si 03 entra, sumá "El calendario queda registrado en la cadena" con un link al explorador de devnet cuando haya dirección (modo real).
- Saldo pendiente = tramos no liberados (`getMerchant`). Actividad `PayoutReleased` en el historial.
- Fuera "provisional". Tiers con `tierLabel()`.

- [x] Selector de plazo con comisión, neto y calendario de tramos
- [x] Ventas con tramos liberados/pendientes; al adelantar el reloj, se liberan
- [x] Acceso a "Venta en mostrador"
- [x] 390/1440 sin scroll horizontal; capturas `evidence/08-*`
- [x] typecheck / lint / test / build en verde
