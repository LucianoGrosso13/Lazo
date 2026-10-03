# Aceptación por comportamiento público

Frontera aprobada: navegador, rutas públicas. Ningún test de adapter/componente privado cuenta como aceptación. Registro vigente; sin afirmar resultados antes de ejecutar.

| Recorrido | Evidencia requerida | Estado |
|---|---|---|
| Entrada y roles | Selector navega a URL del rol, recarga mantiene identidad; real sin selector | pendiente owner01 |
| Compra común | Checkout y estudiante usan misma dirección; fiador consulta mismo plan; comercio y pool reflejan esa compra | pendiente bridge A/01 + UI |
| Pago | Revisión monto/destino/token/red/comisión; cancelar conserva deuda; fallo conserva deuda; confirmar actualiza y recarga | pendiente owner02 |
| Invitación | Crear desde mismo estudiante; abrir sin wallet; token inválido no revela info; alta mock y volver enlace | pendiente owner03 + Q1 |
| Storage | Bloqueado: fallback mismo navegador o error honesto; reset limpia metadata/garantía; declarar alcance navegador | pendiente01/03/05 |
| Mora | Vencimiento, aviso según config, gracia, punitorio; primer cargo; baja/bloqueo; segundo acelera saldo; no doble cargo tras recarga | pendiente A/02/03/05 |
| Admin | Student URL admin sin controles; actor admin y mutaciones ejecutoras; cancelar revisión sin mutar; real sin reloj | pendiente05 + hooks A |
| Lecturas públicas | Pool/comercio sin wallet; montos de estado común; mock sin Explorer | pendiente04 |
| Idioma/pantalla | ES/EN, mobile/desktop cada rol, teclado/overflow, contraste y estados | pendiente integración |
| Calidad | Tipos/lint/build + suite final; Reviews Standards y Spec separados readonly | pendiente integración |

Servidor propio: Node24, http://127.0.0.1:3012, modo mock. Los tests Playwright se ejecutan por archivo durante slices; suite completa sólo cuando terminan integraciones. Modo real tendrá servidor separado y puerto/cache aislados para probar controles, sin firmar/enviar nada.

No probado: conexión Phantom real, Codama/IDL/programa, Didit, Mobbex, token backend/HMAC y navegación entre dispositivos. Esos límites deben figurar en entrega; no reemplazar con éxito mock.
