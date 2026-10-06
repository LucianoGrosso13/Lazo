# Marca 3D del prisma — pipeline HyperFrames

Composición reproducible que genera los assets de marca en `app/public/brand/` y
`app/src/app/{favicon.ico,icon.png}`.

## Archivos

- `index.html` — marca principal 960×640, loop de 4s seamless (solo se mueve la
  luz: sheen sobre el abanico, respiración del haz, glint en la entrada). Fondo
  transparente.
- `compositions/icon.html` — variante cuadrada 640×640 para favicon/app-icon:
  prisma centrado, haces cortos que se apagan, placa vidrio-oscura redondeada
  (legible sobre chrome claro y oscuro del navegador).
- `hyperframes.json`, `meta.json`, `package.json` — scaffold de
  `npx hyperframes init` (pin de CLI 0.8.137 en los scripts npm).

## Regenerar los assets

Requisitos: Node 22+, ffmpeg, `npx hyperframes` (0.8.137 pineado en
`package.json`).

```bash
cd .scratch/demo-polish/brand

# 1) frames RGBA de la marca (t=0 es el still limpio: el sheen está fuera)
npx hyperframes render --format png-sequence --quality draft -o renders/mark-frames

# 2) frames del icono cuadrado
npx hyperframes render -c compositions/icon.html --format png-sequence --quality draft -o renders/icon-frames

# 3) loop de video (sin alpha: VP9 sale yuv420p en este pipeline — el asset
#    está pensado para fondo oscuro con mix-blend-mode: screen)
npx hyperframes render --format webm --quality looks -o renders/logo-prisma-loop.webm
npx hyperframes render --format mp4  --quality looks -o renders/logo-prisma-loop.mp4
```

Post-proceso (Pillow):

```python
from PIL import Image
mark = Image.open("renders/mark-frames/frame_000001.png").convert("RGBA")
mark.resize((480, 320), Image.LANCZOS).save("app/public/brand/logo-prisma.png", optimize=True)
mark.save("app/public/brand/logo-prisma@2x.png", optimize=True)
icon = Image.open("renders/icon-frames/frame_000001.png").convert("RGBA")
icon.resize((256, 256), Image.LANCZOS).save("app/src/app/icon.png", optimize=True)
icon.save("app/src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
```

Los `renders/` son intermedios y no se commitean.

## Diseño

- Prisma triangular de vidrio, cámara 3/4 (extrusión NE 58,-34): se ven la tapa
  frontal y la cara rectangular derecha, más la tapa trasera fantasma.
- Haz blanco `#f4f1ff` entra horizontal por la izquierda; dentro del vidrio se
  quiebra apenas hacia abajo; sale el abanico violeta→cian→verde
  (`#9945ff`/`#00c2ff`/`#19fb9b`, tokens Solana del sitio).
- Loop seamless: `sheen` recorre el abanico fuera del clip en ambos extremos;
  todos los pulsos vuelven a su estado en t=4s. Respeta la regla de la
  dirección: "light moves, glass doesn't".
