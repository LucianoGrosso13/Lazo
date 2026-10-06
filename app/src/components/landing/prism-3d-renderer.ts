import * as THREE from "three";
import { STAGE_LAYOUT } from "./prism-stage";

/**
 * Escena three.js del prisma: un sólido de vidrio real (MeshPhysicalMaterial
 * con transmission + dispersión cromática) que recibe un haz blanco y lo parte
 * en bandas aditivas proporcionales al monto, en el mismo layout viewBox del
 * SVG (STAGE_LAYOUT) para que etiquetas y bandas coincidan entre modos.
 *
 * - La luz vive en quads con texturas de gradiente generadas (núcleo + halo).
 * - El puntero aporta energía: parallax de cámara, brillo y un temblor sutil.
 * - Pausa fuera de pantalla (IntersectionObserver) y con pestaña oculta.
 * - Se carga por import() dinámico: three no entra al bundle inicial.
 */

const MAX_BANDS = 8;
const DPR_CAP = 1.75;
const WORLD_H = 10;
const WORLD_W = (STAGE_LAYOUT.VB_W / STAGE_LAYOUT.VB_H) * WORLD_H;

// vidrio: prisma triangular centrado donde el SVG dibuja el slab
const PRISM = { cx: -0.62, cy: 0.1, cz: 0, radius: 2.15, height: 6.7 };

const sx = (nx: number) => (nx / STAGE_LAYOUT.VB_W - 0.5) * WORLD_W;
const sy = (ny: number) => (0.5 - ny / STAGE_LAYOUT.VB_H) * WORLD_H;

export interface BandSlice {
  /** Cara de salida y abanico en coordenadas viewBox (mismas que el SVG). */
  e0: number;
  e1: number;
  f0: number;
  f1: number;
  color: string;
  on: boolean;
}

/* ------------------------------ texturas ------------------------------- */

/** Haz con decaimiento a lo largo (las bandas mueren en la punta). */
function bandTexture(THREE_: typeof THREE) {
  const w = 256;
  const h = 64;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d");
  const img = ctx.createImageData(w, h);
  const gauss = (d: number, s: number) => Math.exp(-(d * d) / (s * s));
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1) - 0.5;
    const core = gauss(v, 0.2);
    const skirt = gauss(v, 0.5) * 0.3;
    const cross = Math.min(1, core * 1.1 + skirt);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      // nace fuerte en la cara, cae suave y muere en la punta
      const along = (0.8 + 0.2 * (1 - smooth(0, 0.45, u))) * (1 - smooth(0.82, 1, u));
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * cross * along);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE_.CanvasTexture(cv);
  tex.colorSpace = THREE_.SRGBColorSpace;
  return tex;
}

/** Haz entrante: crece desde el borde y penetra el vidrio. */
function inputBeamTexture(THREE_: typeof THREE) {
  const w = 256;
  const h = 64;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d");
  const img = ctx.createImageData(w, h);
  const gauss = (d: number, s: number) => Math.exp(-(d * d) / (s * s));
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1) - 0.5;
    const cross = Math.min(1, gauss(v, 0.15) + gauss(v, 0.42) * 0.3);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const along = smooth(0.02, 0.2, u) * (1 - smooth(0.9, 1, u) * 0.5);
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 252;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * cross * along);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE_.CanvasTexture(cv);
  tex.colorSpace = THREE_.SRGBColorSpace;
  return tex;
}

/** Fotones: guiones de luz que viajan por el haz entrante. */
function photonTexture(THREE_: typeof THREE) {
  const w = 128;
  const h = 16;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d");
  const img = ctx.createImageData(w, h);
  const gauss = (d: number, s: number) => Math.exp(-(d * d) / (s * s));
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1) - 0.5;
    const cross = gauss(v, 0.14);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const dash = u % 0.25 < 0.05 ? 1 : 0; // guion corto cada 32px
      const i = (y * w + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * cross * dash);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE_.CanvasTexture(cv);
  tex.wrapS = THREE_.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.colorSpace = THREE_.SRGBColorSpace;
  return tex;
}

/** Resplandor radial para sprites (cáustica interna, destello de entrada). */
function glowTexture(THREE_: typeof THREE) {
  const s = 128;
  const cv = document.createElement("canvas");
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d");
  const img = ctx.createImageData(s, s);
  const gauss = (d: number, sig: number) => Math.exp(-(d * d) / (sig * sig));
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x / (s - 1) - 0.5, y / (s - 1) - 0.5);
      const a = Math.min(1, gauss(d, 0.16) + gauss(d, 0.4) * 0.3);
      const i = (y * s + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * a);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE_.CanvasTexture(cv);
  tex.colorSpace = THREE_.SRGBColorSpace;
  return tex;
}

/* --------------------------- quad deformable --------------------------- */

interface Quad {
  mesh: THREE.Mesh;
  pos: THREE.BufferAttribute;
}

/** Franja de 4 vértices (dos en la cara del vidrio, dos en la punta). */
function makeQuad(THREE_: typeof THREE, material: THREE.Material): Quad {
  const geom = new THREE_.BufferGeometry();
  const pos = new THREE_.BufferAttribute(new Float32Array(12), 3);
  const uv = new THREE_.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2);
  geom.setAttribute("position", pos);
  geom.setAttribute("uv", uv);
  geom.setIndex([0, 1, 2, 2, 1, 3]);
  const mesh = new THREE_.Mesh(geom, material);
  mesh.frustumCulled = false;
  return { mesh, pos };
}

function setQuad(q: Quad, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, z: number) {
  const a = q.pos.array as Float32Array;
  a[0] = x0; a[1] = y0; a[2] = z;
  a[3] = x1; a[4] = y1; a[5] = z;
  a[6] = x2; a[7] = y2; a[8] = z;
  a[9] = x3; a[10] = y3; a[11] = z;
  q.pos.needsUpdate = true;
}

/* ------------------------------- renderer ------------------------------ */

interface BandMesh {
  quad: Quad;
  material: THREE.MeshBasicMaterial;
  baseOpacity: number;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
}

export class Stage3DRenderer {
  /** Si el render falla a mitad de sesión, el wrapper vuelve al SVG. */
  onFatal: (() => void) | null = null;

  static tryCreate(canvas: HTMLCanvasElement): Stage3DRenderer | null {
    try {
      return new Stage3DRenderer(canvas);
    } catch (e) {
      console.warn("[prism-3d] renderer no disponible:", e);
      return null;
    }
  }

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private prism: THREE.Mesh;
  private prismMat: THREE.MeshPhysicalMaterial;
  private edges: THREE.LineSegments;
  private caustic: THREE.Sprite;
  private flash: THREE.Sprite;
  private beamCore: THREE.Mesh;
  private beamHalo: THREE.Mesh;
  private photons: THREE.Mesh;
  private photonTex: THREE.Texture;
  private wedge: THREE.Mesh;
  private crackLine: THREE.Line;
  private bandPool: BandMesh[] = [];
  private envMap: THREE.Texture;
  private disposables: { dispose: () => void }[] = [];

  private raf = 0;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = true;
  private disposed = false;
  private energy = 0;
  private energyTarget = 0;
  private px = 0.45;
  private py = 0.45;
  private lastPointer: { x: number; y: number; t: number } | null = null;
  private lastScroll: { y: number; t: number } | null = null;
  private crackedK = 0;
  private crackedTarget = 0;
  private time = 0;

  private constructor(private canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    // El pase de transmisión corre a media resolución: vidrio barato.
    renderer.transmissionResolutionScale = 0.55;
    this.renderer = renderer;
    this.disposables.push(renderer);

    // Cámara casi frontal con una leve caída: el vidrio muestra su tapa.
    this.camera = new THREE.PerspectiveCamera(34, STAGE_LAYOUT.VB_W / STAGE_LAYOUT.VB_H, 0.1, 60);
    this.camera.position.set(0.25, 1.35, 16.6);
    this.camera.lookAt(-0.3, 0.15, 0);

    // Entorno de estudio: fondo abyss con emisores del espectro — el vidrio
    // recoge violeta/cian/verde en los bordes en vez de un cuarto blanco.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x060509);
    const panel = (hex: number, x: number, y: number, z: number, w: number, h: number, k: number) => {
      const mat = new THREE.MeshBasicMaterial();
      mat.color.set(hex).multiplyScalar(k);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      envScene.add(m);
    };
    panel(0xf4f1ff, 0, 9, 3, 10, 4, 5); // cielo: reflejo blanco en la tapa
    panel(0x9945ff, -9, 2, -3, 5, 8, 9); // violeta a la izquierda
    panel(0x00c2ff, 9, -2, -2, 5, 7, 7); // cian a la derecha
    panel(0x19fb9b, 2, -8, -5, 6, 3, 4); // verde abajo, tenue
    this.envMap = pmrem.fromScene(envScene, 0.05).texture;
    this.scene.environment = this.envMap;
    this.disposables.push(pmrem, { dispose: () => this.envMap.dispose() });

    // Luces del mundo: violeta arriba-izquierda, cian a la derecha.
    const key = new THREE.DirectionalLight(0xf4f1ff, 1.5);
    key.position.set(-5, 7, 9);
    const violet = new THREE.PointLight(0x9945ff, 14, 16, 1.6);
    violet.position.set(PRISM.cx - 1.5, 2.5, 3.2);
    const cyan = new THREE.PointLight(0x00c2ff, 10, 14, 1.7);
    cyan.position.set(5.5, -1.5, 4.5);
    const fill = new THREE.HemisphereLight(0x8a7bd8, 0x07060b, 0.55);
    this.scene.add(key, violet, cyan, fill);

    // ---------- El sólido de vidrio ----------
    const prismGeom = new THREE.CylinderGeometry(PRISM.radius, PRISM.radius, PRISM.height, 3, 1, false);
    // Rotar para que una cara plana mire al haz (-X) y un vértice al abanico (+X).
    prismGeom.rotateY(Math.PI / 2);
    this.prismMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 1,
      thickness: 2.1,
      ior: 1.52,
      dispersion: 0.55,
      attenuationColor: 0xa678ff,
      attenuationDistance: 3.2,
      envMapIntensity: 0.85,
      specularIntensity: 0.95,
      clearcoat: 0.2,
      clearcoatRoughness: 0.35,
    });
    this.prism = new THREE.Mesh(prismGeom, this.prismMat);
    this.prism.position.set(PRISM.cx, PRISM.cy, PRISM.cz);
    this.scene.add(this.prism);
    this.disposables.push(prismGeom, this.prismMat);

    // Aristas pulidas: el contorno que atrapa la luz.
    const edgeGeom = new THREE.EdgesGeometry(prismGeom, 5);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xf4f1ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.edges = new THREE.LineSegments(edgeGeom, edgeMat);
    this.edges.position.copy(this.prism.position);
    this.scene.add(this.edges);
    this.disposables.push(edgeGeom, edgeMat);

    // ---------- Texturas compartidas ----------
    const glowTex = glowTexture(THREE);
    const beamTex = inputBeamTexture(THREE);
    const bandTex = bandTexture(THREE);
    this.photonTex = photonTexture(THREE);
    this.disposables.push(glowTex, beamTex, bandTex, this.photonTex);

    const additive = (map: THREE.Texture, color: string | number, opacity: number) =>
      new THREE.MeshBasicMaterial({
        map,
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });

    // ---------- Haz entrante ----------
    const beamY = sy(STAGE_LAYOUT.BEAM_Y);
    const faceX = PRISM.cx - PRISM.radius * 0.5;
    const beamX0 = sx(-40); // entra desde fuera del cuadro
    const beamX1 = faceX + 0.5; // penetra el vidrio
    const beamGeom = new THREE.PlaneGeometry(beamX1 - beamX0, 1);
    const beamCoreMat = additive(beamTex, 0xfffaff, 0.95);
    this.beamCore = new THREE.Mesh(beamGeom, beamCoreMat);
    this.beamCore.position.set((beamX0 + beamX1) / 2, beamY, 0.02);
    this.beamCore.scale.y = 0.62;
    const beamHaloMat = additive(beamTex, 0xd9c9ff, 0.32);
    this.beamHalo = new THREE.Mesh(beamGeom, beamHaloMat);
    this.beamHalo.position.set((beamX0 + beamX1) / 2, beamY, -0.02);
    this.beamHalo.scale.y = 2.1;
    // Lámina vertical: le da cuerpo al haz cuando la cámara hace parallax.
    const beamSideGeom = new THREE.PlaneGeometry(beamX1 - beamX0, 0.34);
    beamSideGeom.rotateX(Math.PI / 2);
    const beamSideMat = additive(beamTex, 0xffffff, 0.4);
    const beamSide = new THREE.Mesh(beamSideGeom, beamSideMat);
    beamSide.position.set((beamX0 + beamX1) / 2, beamY, 0);
    // Fotones viajando por el núcleo.
    const photonMat = additive(this.photonTex, 0xffffff, 0.85);
    this.photons = new THREE.Mesh(beamGeom, photonMat);
    this.photons.position.set((beamX0 + beamX1) / 2, beamY, 0.04);
    this.photons.scale.y = 0.5;
    this.scene.add(this.beamCore, this.beamHalo, beamSide, this.photons);
    this.disposables.push(beamGeom, beamSideGeom, beamCoreMat, beamHaloMat, beamSideMat, photonMat);

    // Núcleos opacos dentro del vidrio: SÍ entran al buffer de transmisión —
    // la luz atrapada se ve refractada de verdad a través del sólido.
    const coreGeom = new THREE.IcosahedronGeometry(0.42, 1);
    const coreMat = new THREE.MeshBasicMaterial();
    coreMat.color.setRGB(2.3, 1.7, 3.1); // HDR: el foco de la dispersión
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.position.set(PRISM.cx + PRISM.radius * 0.55, 0.15, 0);
    const spotGeom = new THREE.IcosahedronGeometry(0.24, 1);
    const spot = new THREE.Mesh(spotGeom, coreMat);
    spot.position.set(faceX + 0.35, beamY, 0);
    this.scene.add(core, spot);
    this.disposables.push(coreGeom, spotGeom, coreMat);

    // ---------- Cuna refractada dentro del vidrio ----------
    const wedgeGeom = new THREE.BufferGeometry();
    const exitTopY = sy(STAGE_LAYOUT.EXIT_TOP);
    const exitBotY = sy(STAGE_LAYOUT.EXIT_BOTTOM);
    const wedgeVerts = new Float32Array([
      faceX + 0.15, beamY, 0.06,
      PRISM.cx + PRISM.radius * 0.96, exitTopY, 0.06,
      PRISM.cx + PRISM.radius * 0.96, exitBotY, 0.06,
    ]);
    wedgeGeom.setAttribute("position", new THREE.BufferAttribute(wedgeVerts, 3));
    wedgeGeom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0.5, 1, 0, 1, 1]), 2));
    const wedgeMat = additive(beamTex, 0xe9ddff, 0.42);
    this.wedge = new THREE.Mesh(wedgeGeom, wedgeMat);
    this.wedge.renderOrder = 3;
    this.scene.add(this.wedge);
    this.disposables.push(wedgeGeom, wedgeMat);

    // ---------- Cartelera detrás del vidrio ----------
    // El buffer de transmisión solo incluye opacos: un panel abyss con halos
    // del espectro detrás del prisma → el vidrio lo refracta y se lee el
    // volumen. Fuera del sólido se funde con el fondo del escenario.
    const cardCv = document.createElement("canvas");
    cardCv.width = 512;
    cardCv.height = 512;
    const cctx = cardCv.getContext("2d");
    if (cctx) {
      cctx.fillStyle = "#07060b";
      cctx.fillRect(0, 0, 512, 512);
      const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
        const g = cctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${rgb},${a})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        cctx.fillStyle = g;
        cctx.fillRect(0, 0, 512, 512);
      };
      // ambiente del sitio, para fundirse con la atmósfera del escenario
      blob(90, 140, 200, "153,69,255", 0.13); // violeta arriba-izquierda
      blob(430, 180, 180, "0,194,255", 0.1); // cian derecha
      blob(420, 430, 170, "25,251,155", 0.07); // verde abajo
      // halos dentro de la silueta del prisma (u≈0.35-0.6 del card): la luz
      // que el vidrio refracta
      blob(215, 265, 95, "153,69,255", 0.5);
      blob(305, 235, 85, "0,194,255", 0.38);
      blob(270, 335, 75, "25,251,155", 0.26);
    }
    const cardTex = new THREE.CanvasTexture(cardCv);
    cardTex.colorSpace = THREE.SRGBColorSpace;
    const cardGeom = new THREE.PlaneGeometry(WORLD_W, WORLD_H);
    const cardMat = new THREE.MeshBasicMaterial({ map: cardTex, toneMapped: false });
    const card = new THREE.Mesh(cardGeom, cardMat);
    card.position.set(-0.2, 0, -3.4);
    this.scene.add(card);
    this.disposables.push(cardTex, cardGeom, cardMat);

    // ---------- Cáustica interna + destello de entrada ----------
    const causticMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0x9945ff,
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.caustic = new THREE.Sprite(causticMat);
    this.caustic.position.set(PRISM.cx, PRISM.cy + 0.2, 0.4);
    this.caustic.scale.set(4.0, 4.7, 1);
    this.scene.add(this.caustic);

    const flashMat = causticMat.clone();
    flashMat.color = new THREE.Color(0xfff8ff);
    this.flash = new THREE.Sprite(flashMat);
    this.flash.position.set(faceX, beamY, 0.15);
    this.flash.scale.set(1.35, 1.35, 1);
    this.scene.add(this.flash);
    this.disposables.push(causticMat, flashMat);

    // ---------- Pool de bandas de salida ----------
    for (let i = 0; i < MAX_BANDS; i++) {
      const material = additive(bandTex, 0xffffff, 0.9);
      const quad = makeQuad(THREE, material);
      quad.mesh.renderOrder = 4;
      quad.mesh.visible = false;
      this.scene.add(quad.mesh);
      this.bandPool.push({
        quad,
        material,
        baseOpacity: 0.9,
        targetColor: new THREE.Color(0xffffff),
        currentColor: new THREE.Color(0xffffff),
      });
      this.disposables.push(quad.mesh.geometry, material);
    }

    // ---------- Rajadura grabada en la cara ----------
    const crackPts: THREE.Vector3[] = [];
    let cx = PRISM.cx + 0.15;
    for (let i = 0; i <= 10; i++) {
      const y = 2.1 - (i / 10) * 4.3;
      cx += (Math.sin(i * 2.7) * 0.55 + Math.sin(i * 7.3) * 0.25) * 0.16;
      crackPts.push(new THREE.Vector3(cx, PRISM.cy + y, PRISM.radius * 0.9 + 0.03));
    }
    const crackGeom = new THREE.BufferGeometry().setFromPoints(crackPts);
    const crackMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.crackLine = new THREE.Line(crackGeom, crackMat);
    this.crackLine.renderOrder = 5;
    this.scene.add(this.crackLine);
    this.disposables.push(crackGeom, crackMat);

    // ---------- Ciclo de vida ----------
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.kick();
    });
    this.io.observe(canvas);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true, capture: true });
    this.resize();
  }

  /** Ancho/lado de banda por monto — el React pasa el mismo layout que el SVG. */
  setBands(bands: BandSlice[]) {
    const { rightX, FAN_END_X } = STAGE_LAYOUT;
    const n = Math.min(bands.length, MAX_BANDS);
    const activeCount = bands.slice(0, n).filter((b) => b.on).length;
    let seen = 0;
    for (let i = 0; i < n; i++) {
      const b = bands[i];
      const mesh = this.bandPool[i];
      if (!b.on) {
        mesh.quad.mesh.visible = false;
        continue;
      }
      const bi = seen++;
      // Dispersión: cada banda sale en su color y con su plano levemente propio.
      const z = 0.1 + bi * 0.055;
      const zTip = z + (bi - (activeCount - 1) / 2) * 0.32;
      const spread = 1.55; // la falda del glow excede el tramo de datos
      const padExit = ((b.e1 - b.e0) * (spread - 1)) / 2;
      const padTip = ((b.f1 - b.f0) * (spread - 1)) / 2;
      setQuad(
        mesh.quad,
        sx(rightX(b.e0)), sy(b.e0 - padExit),
        sx(rightX(b.e1)), sy(b.e1 + padExit),
        sx(FAN_END_X), sy(b.f0 - padTip),
        sx(FAN_END_X), sy(b.f1 + padTip),
        z,
      );
      // La punta sale del plano: cada banda toma su propio ángulo de dispersión.
      const a = mesh.quad.pos.array as Float32Array;
      a[8] = zTip;
      a[11] = zTip;
      mesh.quad.pos.needsUpdate = true;
      mesh.quad.mesh.visible = true;
      mesh.targetColor.set(b.color);
    }
    for (let i = n; i < MAX_BANDS; i++) this.bandPool[i].quad.mesh.visible = false;
  }

  setCracked(cracked: boolean) {
    this.crackedTarget = cracked ? 1 : 0;
  }

  private onVisibility = () => {
    if (!document.hidden) this.kick();
  };

  private onPointer = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 0) {
      this.px = (e.clientX - r.left) / r.width;
      this.py = (e.clientY - r.top) / r.height;
    }
    const now = performance.now();
    if (this.lastPointer) {
      const dt = Math.max(1, now - this.lastPointer.t);
      const d = Math.hypot(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
      this.energyTarget = Math.min(1, Math.max(this.energyTarget, d / dt / 6));
    }
    this.lastPointer = { x: e.clientX, y: e.clientY, t: now };
  };

  private onScroll = () => {
    const now = performance.now();
    const y = window.scrollY;
    if (this.lastScroll) {
      const dt = Math.max(1, now - this.lastScroll.t);
      this.energyTarget = Math.min(1, Math.max(this.energyTarget, Math.abs(y - this.lastScroll.y) / dt / 3));
    }
    this.lastScroll = { y, t: now };
  };

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
      this.camera.aspect = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
      this.camera.updateProjectionMatrix();
    }
    this.kick();
  }

  private kick() {
    if (this.raf === 0 && this.visible && !document.hidden && !this.disposed) {
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (nowMs: number) => {
    this.raf = 0;
    if (!this.visible || document.hidden || this.disposed) return;
    const now = nowMs / 1000;
    const dt = Math.min(0.05, Math.max(0, now - this.time));
    this.time = now;

    // La energía del puntero decae; la escena respira.
    this.energyTarget *= 0.9;
    this.energy = Math.max(this.energy * 0.95, this.energyTarget);
    this.crackedK += (this.crackedTarget - this.crackedK) * Math.min(1, dt * 7);

    // Cámara: parallax mínimo con el puntero.
    this.camera.position.x = 0.25 + (this.px - 0.5) * 0.7;
    this.camera.position.y = 1.35 + (this.py - 0.5) * -0.5;
    this.camera.lookAt(-0.3, 0.15, 0);

    // El vidrio respira y tiembla apenas con la energía.
    const wob = this.energy;
    this.prism.rotation.y = Math.sin(now * 0.4) * 0.018 + (this.px - 0.5) * 0.1 + Math.sin(now * 7.1) * 0.012 * wob;
    this.prism.rotation.x = (this.py - 0.5) * 0.05 + Math.sin(now * 5.3) * 0.008 * wob;
    this.edges.rotation.copy(this.prism.rotation);

    // Rajado: el vidrio se apaga y la banda pierde espectro.
    this.prismMat.roughness = 0.055 + this.crackedK * 0.25;
    this.prismMat.envMapIntensity = 1.4 - this.crackedK * 0.55;
    (this.crackLine.material as THREE.LineBasicMaterial).opacity = this.crackedK * 0.85;

    // Cáustica: deriva con el puntero como en el SVG.
    this.caustic.position.x = PRISM.cx + (this.px - 0.45) * 1.5;
    this.caustic.position.y = PRISM.cy + 0.2 + (this.py - 0.45) * 2.0;
    (this.caustic.material as THREE.SpriteMaterial).opacity = (0.26 + this.energy * 0.32) * (1 - this.crackedK * 0.5);

    (this.flash.material as THREE.SpriteMaterial).opacity =
      (0.5 + 0.5 * this.energy + 0.12 * Math.sin(now * 1.7)) * (1 - this.crackedK * 0.4);

    // Fotones: guiones que viajan al vidrio.
    this.photonTex.offset.x = (this.photonTex.offset.x - dt * 0.55) % 1;

    // Bandas: brillo respirando; el color se apaga al rajarse.
    const dim = 1 - this.crackedK * 0.25;
    for (const b of this.bandPool) {
      if (!b.quad.mesh.visible) continue;
      const lum = b.targetColor.r * 0.3 + b.targetColor.g * 0.4 + b.targetColor.b * 0.3;
      const sat = 1 - this.crackedK * 0.75;
      b.currentColor.setRGB(
        lum + (b.targetColor.r - lum) * sat,
        lum + (b.targetColor.g - lum) * sat,
        lum + (b.targetColor.b - lum) * sat,
      );
      b.material.color.copy(b.currentColor);
    }
    let vi = 0;
    for (const b of this.bandPool) {
      if (!b.quad.mesh.visible) continue;
      const i = vi++;
      b.material.opacity = b.baseOpacity * dim * (0.88 + 0.12 * Math.sin(now * 5 + i * 1.7)) * (1 + this.energy * 0.2);
    }

    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      // Fallo de GPU a mitad de sesión: el wrapper vuelve al SVG.
      this.dispose();
      this.onFatal?.();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("scroll", this.onScroll, true);
    for (const d of this.disposables) d.dispose();
    // No loseContext: React Strict Mode remonta el efecto sobre el mismo canvas.
  }
}
