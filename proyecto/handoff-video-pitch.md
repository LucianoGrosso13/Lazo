# Handoff — video pitch 2:00 (Colosseum + Superteam AR)

Actualizado 2026-10-08 (segunda sesión). Rama `video-pitch`.

## Estado

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
