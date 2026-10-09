# Handoff — video pitch 2:00 (Colosseum + Superteam AR)

Actualizado 2026-10-08 (segunda sesión). Rama `video-pitch`.

## Estado

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
