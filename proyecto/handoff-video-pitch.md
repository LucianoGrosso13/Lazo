# Handoff — video pitch 2:00 (Colosseum + Superteam AR)

Actualizado 2026-10-08 (segunda sesión). Rama `video-pitch`.

## Estado

### Final con link y versión con subtítulos (2026-10-09, quinta sesión)

**Ronda 2 (pedido de Luciano):** el link también aparece bajo el logo cuando dicen "and we are building Lazo" (30,45–35,3 s; queda sobre el esquema People → Lazo → Fintech wallets después de que sale el logo; `#lazo-url` en `s03-lazo.html`), y los subtítulos van **siempre centrados abajo** (cambiar de lado se veía raro). Para que no se pisen, en el render con subtítulos las tarjetas de abajo suben entre 20 y 120 px (`LIFTS` en `scripts/build-subs.py`, con márgenes: GSAP descarta `translate`). Entregables con música muy baja: `renders/lazo-pitch-final-musica.mp4` y `renders/lazo-pitch-final-subs-en-musica.mp4`.

- Luciano pidió poner el link de la página: la placa final muestra la píldora `lazo-cuotas.vercel.app` (entra en 109,1 s) bajo la frase. **Esta es la versión final:** `video-pitch/renders/lazo-pitch-final.mp4` (1:54, 1080p, sin música; reemplaza al final anterior, que sigue igual en `lazo-pitch-v3-sin-musica.mp4`).
- **Con música (elegida por Luciano: pulso C "muy baja"):** `renders/lazo-pitch-final-musica.mp4` y `renders/lazo-pitch-final-subs-en-musica.mp4`. Video copiado de los renders nuevos + pista de audio de `lazo-pitch-final-musica-c-muy-baja.mp4` (misma edición, sin re-render): `ffmpeg -i <video>.mp4 -i lazo-pitch-final-musica-c-muy-baja.mp4 -map 0:v:0 -map 1:a:0 -c copy`.
- Versión de prueba con **subtítulos en inglés quemados**: `video-pitch/renders/lazo-pitch-final-subs-en.mp4`. Los subtítulos salen de `transcript-parakeet.json` (Parakeet, más preciso que el `transcript.json` viejo) con los errores del reconocimiento corregidos a mano (`FIXES` en `scripts/build-subs.py`: paystub, fintech, "That pool lives on Solana"…). Van abajo; cuando hay una tarjeta a la izquierda se corren a la derecha y viceversa.
- `python3 scripts/build-subs.py` regenera `compositions/s10-subs.html`, el `.srt` (`video-pitch/lazo-pitch-subs-en.srt`, para subir como subtítulo aparte en YouTube) y una copia para render en `/tmp/lazo-pitch-subs/` (index.html con la capa encima; no se deja en el repo porque dos index en la raíz rompen `check`). Render: `npx hyperframes@0.8.142 render /tmp/lazo-pitch-subs -o "$PWD/renders/lazo-pitch-final-subs-en.mp4" --workers 4 --low-memory-mode`.

### v3 (2026-10-09, cuarta sesión)

- Luciano eligió la **placa normal**: se sacó la placa de drones y la frase repetida de `index.html`, que vuelve a durar 114 s (`s09b-drones.html` queda en el repo como alternativa, sin usar).
- Panel del 45 % a pantalla completa 1 s más corto: sale a 19,7 s (antes 20,7 s); sigue tapando el empalme de 17,53 s.
- Render sin música: `video-pitch/renders/lazo-pitch-v3-sin-musica.mp4` (fuera de git).
- **Versión final elegida por Luciano: sin música** → `video-pitch/renders/lazo-pitch-final.mp4` (1:54, 1080p, placa normal; copia de la v3). Las tres camas (`scripts/build-music.py`) no le gustaron: muy fuertes y rápidas. La que más le gustó fue C (pulso), pero la quiere mucho más lenta y baja; queda como mejora opcional, no bloquea la entrega. Prueba con C a −22 dB bajo la voz (−12 dB en la placa), mezclada con ffmpeg sobre el final: `renders/lazo-pitch-final-musica-c-baja.mp4` (+ `-720p`).

### v2 (2026-10-09, tercera sesión)

- Feedback de Luciano implementado (detalle en `video-pitch/STORYBOARD.md` § v2): grade natural, fundidos en los cortes, checklist en el hook, 45 % y tarjetas sobre las remeras, comercio sin resta, pool a pantalla completa con reglas, mapa de Argentina con comercios, placa sin URL ni devnet, y placa alternativa con show de drones.
- **Render de comparación:** `video-pitch/renders/lazo-pitch-v2-comparacion-finales.mp4` (fuera de git, ~2:06, sin música). **Falta que Luciano elija final** (normal o drones); después se borra el otro en `index.html`, `data-duration` vuelve a 114 y se renderiza el final (<2:00). Renderizar con `--workers 4 --low-memory-mode`: con 1 worker la captura se cuelga en el cuadro ~1991.
- Música: sigue pendiente (CLI de HeyGen no instalado).
- `edit.mp4` se regenera con `python3 scripts/build-edit.py` (≈8 min, ya trae grade y fundidos). La captura original del estadio está en `_src/estadio-sancor-original.webp`.

### v1

- **Composición HyperFrames armada y chequeada** en `video-pitch/` (`npx hyperframes check` pasa: 0 errores; contraste AA 116/116). Commit `fdedfee`.
- **Render v1 sin música:** `video-pitch/renders/lazo-pitch-v1-sin-musica.mp4` (fuera de git). Duración 1:54.
- **Falta la música.** Luciano eligió el catálogo de HeyGen (sesión OAuth iniciada), pero `media-use resolve --type bgm` necesita el **CLI de HeyGen**, que tiene que instalar él (`curl -fsSL https://static.heygen.ai/cli/install.sh | bash` y `heygen auth login --oauth`). Después: `npx hyperframes media-use resolve --type bgm --intent "soft warm instrumental startup pitch…" --project video-pitch`, sumar `<audio id="music-bed">` en `index.html` con lane de volumen (~0,15 bajo la voz, sube en la placa desde 107,4 s, fade-out al final), correr `hyperframes-audio/scripts/carve.mjs --comp index.html`, `check` y re-render.

## Decisiones (todas confirmadas por Luciano)

- Framework: solo HyperFrames. Storyboard sí. Después de los bocetos, video entero de una (sin frenar en checkpoints).
- Izquierda (remera Nike) = **Luciano Grosso · Product Owner**; derecha = **Ignacio Albarracín · Full Stack Developer**.
- Solo `Ultima.MP4` + audio del micrófono `Intento 3` (desfase 0,136 s medido por correlación cruzada). Las otras tomas no se usan.
- 8 cortes (lista en `video-pitch/STORYBOARD.md`); un solo empalme a mitad de frase (coma de "credit history"), tapado por el panel INDEC. Los empalmes visibles alternan escala de cámara.
- Identidad Prisma (abyss, Bricolage + Martian Mono, verde/cian/violeta), sin paneles blancos ni logos de partners. Chips "Simulator", "Prototype", "Planned integration", "Running on Solana devnet". En pantalla "45%" con fuente INDEC.

## Cómo está armado

- `video-pitch/index.html`: toma (`assets/footage/edit.mp4`) + reencuadres de cámara + 10 sub-composiciones (`compositions/s01…s09`).
- `assets/footage/edit.mp4` está fuera de git: se regenera con `python3 scripts/build-edit.py` (necesita `_src/`).
- Preview: `cd video-pitch && npx hyperframes preview --background` (parar con `--stop`).
