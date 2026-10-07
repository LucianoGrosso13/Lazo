# 07: Reloj de demo — explicación al abrir y leyenda de cada día

**What to build:** el reloj flotante deja de ser un misterio. La primera vez que se abre muestra una línea de qué hace ("Adelantá el tiempo para ver qué pasa con un plan: vencimientos, mora y cobros"). Cada marca de la regla (día 0, vencimiento, gracia, aviso, recargo, cobro al fiador y liberación de tramos del comercio) tiene una leyenda visible o un tooltip accesible, con los días tomados de la config.

**Blocked by:** —

**Status:** done

**Archivos propios:** `app/src/components/demo-clock/{demo-clock.tsx,demo-clock.module.css}`, `app/src/i18n/dictionaries/demo-clock.ts`.

Notas:
- Días desde `getConfig()` (`graceDays`, `guarantorNoticeDay`, `guarantorChargeDay`, `penaltyBps`), nunca hardcodeados.
- Leyenda: "Día 0: compra" · "Vence la cuota" · "Gracia: N días sin recargo" · "Día N: aviso al fiador" · "Recargo del X%" · "Día N: se cobra al fiador y bajás un tier" · "Tramo del comercio liberado". La marca de tramos aparece solo si hay ventas con tramos (si 01 ya está mergeado; si no, dejala preparada detrás de un dato opcional).
- La explicación inicial se puede cerrar y no vuelve a aparecer (localStorage). Tiene que funcionar con teclado y lector de pantalla.
- Que no tape contenido en 390 px.

- [x] Explicación al primer uso, se puede cerrar y queda recordada
- [x] Leyenda accesible de cada marca, valores desde la config
- [x] "Tier", no "escalón"
- [x] 390/1440; capturas `evidence/07-*`
- [x] typecheck / lint / test / build en verde
