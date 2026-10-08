---
workflow: general-video
flow: automation
storyboard: yes
message: "Lazo lets people with income but no credit card pay in installments, backed by a trusted guarantor and a shared credit pool on Solana."
destination: hackathon-submission
aspect: 1920x1080
language: en
audience: Colosseum / Superteam Argentina judges
length: "≤2:00 (hard cap)"
angle: founders-to-camera pitch with product overlays
---

## Intent

Video pitch de 2:00 para Colosseum Crypto World's Fair (Superteam AR). Luciano e Ignacio hablan a cámara; el video sigue los cortes del guion vigente en `proyecto/05-pitch.md` § "Guion video pitch — 2:00" (versión 8/10, 8 bloques). Estructura del video de Monid (referencia en `_ref/ref.mp4`): toma fija de los fundadores, apoyos visuales que entran y salen (cifra grande, nombre con tipeo, tarjetas de UI al costado, cortes a pantalla completa, placa final). Identidad de Lazo, no la de Monid.

## Assets

- _src/video hackaton/Ultima.MP4 — toma principal 6:03 (los dos a cámara). Va con el audio de `Intento 3 completo.m4a`.
- _src/video hackaton/Intento 3 completo.m4a — audio de micrófono de la misma toma. Desfase medido: cam_time = m4a_time + 0,136 s, deriva < 2 ms en 6 min.
- _src/video hackaton/Intento 2 completo.m4a, Parte 1 intento 1.m4a, Parte 2 intento 1.m4a — tomas alternativas sin video: solo debajo de pantalla completa o corte a producto, nunca sobre la cara.
- ../app/public/brand/logo-prisma.png, logo-prisma@2x.png, logo-prisma-loop.mp4/.webm — logo de Lazo.
- https://lazo-cuotas.vercel.app — pantallas de referencia para recrear tarjetas de producto en HTML.

## Customizations

- Tarjetas de producto recreadas en HTML animado: checkout 3 vs 6 cuotas, cobro inmediato 1.000 / 300 / 700 / 49 / 951, QR del mostrador, esquema pool → comercio → repago.
- Chips chicos en Martian Mono ("Simulator", "Prototype", "Planned integration", "Running on Solana devnet") — propuesta a revisar con Luciano.
- Pie INDEC: en pantalla "45%" con la fuente, aunque la voz diga "over 40%".
- Música: base instrumental suave, con ducking bajo la voz y subida en la placa final.

## Notes

- Left (Nike t-shirt) = Luciano; right = Ignacio.
- Luciano (8/10): sketches first, then the whole video in one go. Music from the HeyGen catalog.

- Tope duro 2:00. Si sobra tiempo, lo primero que sale es la frase de comisiones de red.
- Paleta Lazo "Prisma": fondo abyss #07060b, tinta #f4f1ff, ink-ghost #6a6488, acentos violeta #9945ff / cian #00c2ff / verde #19fb9b. Tipos: Bricolage Grotesque + Martian Mono.
- Sin subtítulos (por ahora). Sin logos de partners. Nada de Explorer salvo operación realmente observada en devnet.
- Material crudo (`_src/`, `_ref/`) y renders fuera de git. El MP4 final lo sube Luciano; no publicar nada.
