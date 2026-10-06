import * as THREE from "three";
import { STAGE_LAYOUT } from "./prism-stage";

/**
 * Escena three.js del prisma: un sólido de vidrio tallado (MeshPhysicalMaterial
 * con transmisión + dispersión cromática) en forma de prisma de pie — vértice
 * arriba y base abajo, el monolito clásico. El haz blanco entra por la
 * izquierda, toca la arista de entrada y sale partido en bandas del espectro
 * de Solana por la arista de salida, proporcionales al monto, en el mismo
 * layout viewBox del SVG (STAGE_LAYOUT) para que etiquetas y bandas coincidan
 * entre modos.
 *
 * - El vidrio es un prisma triangular extruido con bisel: las aristas atrapan
 *   la luz del entorno de estudio (PMREM con emisores violeta/cian/verde) y la
 *   dispersión deja flecos de color en los bordes.
 * - El pase de transmisión solo incluye OPACOS: por eso la luz atrapada dentro
 *   del vidrio es opaca y hay una tarjeta refractora chica detrás de la
 *   silueta — su alpha cae a cero antes del borde (alphaTest), así que el
 *   canvas se funde con la atmósfera de la página sin rectángulo visible.
 * - Compensación de parallax (`lift`): las bandas viven a distintas
 *   profundidades pero se proyectan exacto al plano viewBox — las etiquetas
 *   HTML nunca se despegan de las puntas.
 * - La luz se mueve, el vidrio no: el puntero dirige la luz principal (los
 *   reflejos barren el cristal), la energía da brillo y temblor al haz, y cada
 *   cambio de precio/escalón dispara un pulso de re-refracción (pulse()).
 * - Pausa fuera de pantalla (IntersectionObserver) y con pestaña oculta.
 * - Se carga por import() dinámico: three no entra al bundle inicial.
 */

const MAX_BANDS = 8;
const DPR_CAP = 1.75;
const WORLD_H = 10;
const WORLD_W = (STAGE_LAYOUT.VB_W / STAGE_LAYOUT.VB_H) * WORLD_H;

const sx = (nx: number) => (nx / STAGE_LAYOUT.VB_W - 0.5) * WORLD_W;
const sy = (ny: number) => (0.5 - ny / STAGE_LAYOUT.VB_H) * WORLD_H;

/* ------------------------------ el vidrio ------------------------------ */

// Prisma de pie en el plano viewBox (z = 0): vértice arriba y base apoyada
// abajo — la silueta vertical del monolito. El haz entra por la arista
// izquierda a la altura del beam y el abanico nace de la arista derecha.
// Coordenadas en mundo (viewBox: AP(455,48) BL(322,478) BR(582,478)).
const AP = { x: -0.45, y: 4.14 }; // vértice superior (la punta)
const BL = { x: -2.82, y: -3.54 }; // base izquierda
const BR = { x: 1.82, y: -3.54 }; // base derecha
const PRISM_DEPTH = 1.5; // extrusión en z — delgada, se lee como placa triangular
const BEVEL = { size: 0.13, thickness: 0.16 }; // tallado: aristas biseladas
const FRONT_Z = PRISM_DEPTH / 2 + BEVEL.thickness; // cara frontal del vidrio

const BEAM_WY = sy(STAGE_LAYOUT.BEAM_Y); // altura del haz en mundo (~0.54)

// Aristas laterales: t = 0 en el vértice, t = 1 en la base. La izquierda
// (AP→BL) recibe el haz; la derecha (AP→BR) es la cara de salida del abanico.
const edgeT = (y: number) => Math.min(1, Math.max(0, (AP.y - y) / (AP.y - BL.y)));
const edgeL = (y: number) => AP.x + edgeT(y) * (BL.x - AP.x);
const edgeR = (y: number) => AP.x + edgeT(y) * (BR.x - AP.x);
/** x del borde del vidrio a la altura y — la arista de salida del abanico. */
const edgeX = edgeR;
/** Punto donde el haz toca la arista de entrada. */
const ENTRY_X = edgeL(BEAM_WY);

/* --------------------------- plano de proyección ------------------------ */

// La cámara mira levemente desde arriba y a la derecha: un punto a profundidad
// z se proyecta corrido respecto del plano z=0. `lift` devuelve la posición en
// mundo que PROYECTA exacto a (x0,y0) del plano viewBox estando a profundidad z
// — así las bandas tienen volumen y las etiquetas no se despegan jamás.
const CAM = { x: 1.15, y: 1.9, z: 15.9, fov: 36, lookX: -0.35, lookY: 0.05 };
/**
 * Posición en mundo que proyecta a (x0,y0) del plano z=0 estando a
 * profundidad z — el contrato "las etiquetas no se despegan". Exportada
 * para test: con z=0 es identidad y con z>0 corrige hacia el ancla de cámara.
 */
export function lift(x0: number, y0: number, z: number): [number, number] {
  const k = z / CAM.z;
  return [x0 - (x0 - CAM.x) * k, y0 - (y0 - CAM.y) * k];
}

export interface BandSlice {
  /** Cara de salida y abanico en coordenadas viewBox (mismas que el SVG). */
  e0: number;
  e1: number;
  f0: number;
  f1: number;
  color: string;
  on: boolean;
}

/** Lo que el layout le pasa al renderer por banda (el resto es de etiquetas). */
export interface SliceInput {
  e0: number;
  e1: number;
  f0: number;
  f1: number;
  color: string;
  on: boolean;
}

/**
 * Recorta la geometría del layout a lo que dibuja el canvas. Función pura y
 * exportada para que el contrato layout↔canvas tenga test: si las etiquetas
 * HTML y las bandas 3D usan el mismo layout, nunca se despegan.
 */
export function toSlices(geom: SliceInput[]): BandSlice[] {
  return geom.map((g) => ({ e0: g.e0, e1: g.e1, f0: g.f0, f1: g.f1, color: g.color, on: g.on }));
}

/* ------------------------------ texturas ------------------------------- */

/** Perfil transversal de luz: núcleo gaussiano + falda suave. */
function lightRamp(THREE_: typeof THREE, opts: { core: number; skirt: number; skirtK: number; head: number; tail: number }) {
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
    const cross = Math.min(1, gauss(v, opts.core) * 1.15 + gauss(v, opts.skirt) * opts.skirtK);
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1);
      const along = smooth(0, opts.head, u) * (1 - smooth(opts.tail, 1, u));
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
      const dash = u % 0.25 < 0.055 ? 1 : 0;
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

/** Resplandor radial suave (sprites, destellos, charco de luz, polvo). */
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
      const a = Math.min(1, gauss(d, 0.13) + gauss(d, 0.38) * 0.3);
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

/**
 * Tarjeta refractora: el pase de transmisión solo ve opacos, así que este
 * panel OPACO chico va detrás del vidrio para que el cristal tenga algo rico
 * que refractar — la cuña del haz abriéndose al espectro, apenas teñida (un
 * card brillante lava la cara entera de leche: el vidrio se cristaliza con
 * fondo oscuro y poco contenido). A diferencia de la vieja
 * cartelera de fondo, no reproduce la atmósfera de la página: el alpha cae a
 * cero bien antes del borde del quad (falloff radial) y `alphaTest` descarta
 * el resto. No hay rectángulo visible — fuera de la silueta del vidrio queda
 * el fondo real de la página.
 */
function refractorTexture(THREE_: typeof THREE) {
  const s = 384;
  const cv = document.createElement("canvas");
  cv.width = s;
  cv.height = s;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("2d");
  const blob = (x: number, y: number, r: number, rgb: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  };
  // Lavados de ambiente apenas: el vidrio refracta un eco del espectro sin
  // manchas redondas que lean como bolas detrás del cristal.
  blob(s * 0.3, s * 0.26, s * 0.34, "120,70,235", 0.035);
  blob(s * 0.76, s * 0.4, s * 0.3, "0,150,235", 0.03);
  blob(s * 0.5, s * 0.88, s * 0.34, "15,200,140", 0.02);
  // El haz dentro del vidrio: una cuña triangular que va de la arista de
  // entrada (izquierda) a la arista de salida (derecha), con gradiente de
  // blanco al espectro — la luz que se parte adentro del cristal. El blur
  // deshace los bordes: se ve como volumen de luz, no como figura.
  const fanGrad = ctx.createLinearGradient(s * 0.3, s * 0.46, s * 0.78, s * 0.62);
  fanGrad.addColorStop(0, "rgba(215,200,255,0.13)");
  fanGrad.addColorStop(0.4, "rgba(153,69,255,0.11)");
  fanGrad.addColorStop(0.65, "rgba(0,194,255,0.08)");
  fanGrad.addColorStop(1, "rgba(25,251,155,0.05)");
  ctx.save();
  ctx.filter = "blur(9px)";
  ctx.beginPath();
  ctx.moveTo(s * 0.3, s * 0.44);
  ctx.lineTo(s * 0.3, s * 0.48);
  ctx.lineTo(s * 0.78, s * 0.66);
  ctx.lineTo(s * 0.66, s * 0.38);
  ctx.closePath();
  ctx.fillStyle = fanGrad;
  ctx.fill();
  ctx.restore();
  ctx.filter = "none";
  // Falloff radial: el contenido baja a negro (≈ el abyss de la página) y el
  // alpha a cero antes del borde del quad — el alphaTest corta donde ya no
  // se distingue del fondo, así que la tarjeta no tiene arista visible.
  const img = ctx.getImageData(0, 0, s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = x / (s - 1) - 0.5;
      const dy = y / (s - 1) - 0.5;
      const r = Math.hypot(dx, dy) * 2; // 0 en el centro, ~1 en la arista
      const t = Math.min(1, Math.max(0, (0.66 - r) / 0.3));
      const fall = t * t * (3 - 2 * t);
      const i = (y * s + x) * 4;
      img.data[i] = Math.round(img.data[i] * fall);
      img.data[i + 1] = Math.round(img.data[i + 1] * fall);
      img.data[i + 2] = Math.round(img.data[i + 2] * fall);
      img.data[i + 3] = Math.round(img.data[i + 3] * fall);
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

function setQuad(q: Quad, v: number[]) {
  const a = q.pos.array as Float32Array;
  for (let i = 0; i < 12; i++) a[i] = v[i];
  q.pos.needsUpdate = true;
}

/* ------------------------------- renderer ------------------------------ */

interface BandMesh {
  core: Quad;
  glow: Quad;
  coreMat: THREE.MeshBasicMaterial;
  glowMat: THREE.MeshBasicMaterial;
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
  private prismSideMat: THREE.MeshPhysicalMaterial;
  private edgeMat: THREE.LineBasicMaterial;
  private shaftMat: THREE.MeshBasicMaterial;
  private coreBeamMat: THREE.MeshBasicMaterial;
  private smearMat: THREE.MeshBasicMaterial;
  private beamCoreMat: THREE.MeshBasicMaterial;
  private beamHaloMat: THREE.MeshBasicMaterial;
  private photonTex: THREE.Texture;
  private photonMatRef: THREE.MeshBasicMaterial | null = null;
  private entryGlowMat: THREE.MeshBasicMaterial;
  private faceGlowMat: THREE.MeshBasicMaterial;
  private sheenMat: THREE.MeshBasicMaterial;
  private poolMat: THREE.MeshBasicMaterial;
  private causticFloorMat: THREE.MeshBasicMaterial;
  private caustic: THREE.Sprite;
  private flash: THREE.Sprite;
  private apex: THREE.Sprite;
  private crackLine: THREE.Line;
  private crackGlow: THREE.Line;
  private dust: THREE.Points;
  private dustMat: THREE.PointsMaterial;
  private dustSpeed: Float32Array;
  private keyLight: THREE.DirectionalLight;
  private violetLight: THREE.PointLight;
  private cyanLight: THREE.PointLight;
  private bandPool: BandMesh[] = [];
  private envMap: THREE.Texture;
  private raycaster = new THREE.Raycaster();
  private disposables: { dispose: () => void }[] = [];

  private raf = 0;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = true;
  private disposed = false;
  private energy = 0;
  private energyTarget = 0;
  private pulseK = 0;
  private hoverK = 0;
  private hoverTarget = 0;
  private frames = 0;
  private px = 0.45;
  private py = 0.45;
  private ndc = new THREE.Vector2(0, 0);
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
    renderer.toneMappingExposure = 1.1;
    // El pase de transmisión a resolución plena: la luz refractada se ve
    // nítida (filos de luz), no masa lechosa.
    renderer.transmissionResolutionScale = 1;
    this.renderer = renderer;
    this.disposables.push(renderer);

    // Cámara apenas por encima y a la derecha: se ve la cara superior del
    // vidrio y un filo del lateral — profundidad sin romper el plano viewBox.
    this.camera = new THREE.PerspectiveCamera(CAM.fov, STAGE_LAYOUT.VB_W / STAGE_LAYOUT.VB_H, 0.1, 60);
    this.camera.position.set(CAM.x, CAM.y, CAM.z);
    this.camera.lookAt(CAM.lookX, CAM.lookY, 0);

    // ---------- Entorno de estudio (PMREM) ----------
    // Cuarto negro con emisores del espectro: el vidrio recoge reflejos
    // violeta/cian/verde en las facetas en vez de un estudio blanco.
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
    panel(0xc4b0ff, 0, 11, 2, 12, 1.4, 1.6); // cielo: una franja angosta = filo del tallado, no lavado blanco
    panel(0x9945ff, -10, 1, -3, 6, 9, 8); // violeta a la izquierda
    panel(0x00c2ff, 10, -2, -1, 6, 8, 6); // cian a la derecha
    panel(0x19fb9b, 3, -9, -4, 7, 4, 3); // verde abajo, tenue
    panel(0xd8c8ff, -4, 3, 8, 2, 2, 1.4); // chispa frontal: destello en facetas, teñido
    this.envMap = pmrem.fromScene(envScene, 0.05).texture;
    this.scene.environment = this.envMap;
    this.disposables.push(pmrem, { dispose: () => this.envMap.dispose() });

    // ---------- Luces del mundo ----------
    const key = new THREE.DirectionalLight(0xf4f1ff, 1.3);
    key.position.set(-5, 7, 9);
    const violet = new THREE.PointLight(0x9945ff, 6, 18, 1.6);
    violet.position.set(ENTRY_X - 1.2, 2.2, 3.4);
    const cyan = new THREE.PointLight(0x00c2ff, 5, 16, 1.7);
    cyan.position.set(BR.x + 4, -1.2, 4.2);
    const fill = new THREE.HemisphereLight(0x8a7bd8, 0x07060b, 0.5);
    this.scene.add(key, violet, cyan, fill);
    this.keyLight = key;
    this.violetLight = violet;
    this.cyanLight = cyan;

    // ---------- El sólido de vidrio ----------
    // Prisma triangular extruido con bisel en todas las aristas: el tallado
    // que atrapa la luz. De pie: vértice arriba, base abajo.
    const tri = new THREE.Shape();
    tri.moveTo(AP.x, AP.y);
    tri.lineTo(BL.x, BL.y);
    tri.lineTo(BR.x, BR.y);
    tri.closePath();
    const prismGeom = new THREE.ExtrudeGeometry(tri, {
      depth: PRISM_DEPTH - BEVEL.thickness * 2,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: BEVEL.thickness,
      bevelSize: BEVEL.size,
      bevelSegments: 3,
    });
    prismGeom.translate(0, 0, -(PRISM_DEPTH - BEVEL.thickness * 2) / 2);
    this.prismMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      thickness: 1.4,
      ior: 1.52,
      dispersion: 0.5,
      attenuationColor: 0x2b1a52,
      attenuationDistance: 2.1,
      envMapIntensity: 0.7,
      specularIntensity: 0.4,
      iridescence: 0.06,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [120, 380],
      clearcoat: 0.15,
      clearcoatRoughness: 0.35,
    });
    // Las paredes del tallado (group 1 del Extrude) van con otro vidrio:
    // oscuro y poco reflectivo. La tapa frontal las refracta por dentro —
    // si fueran claras lavan la cara entera de leche; oscuras leen como el
    // canto pulido de un cristal grueso.
    this.prismSideMat = new THREE.MeshPhysicalMaterial({
      color: 0x241640,
      metalness: 0,
      roughness: 0.3,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.5,
      attenuationColor: 0x3d2470,
      attenuationDistance: 0.7,
      envMapIntensity: 0.35,
      specularIntensity: 0.45,
    });
    this.prism = new THREE.Mesh(prismGeom, [this.prismMat, this.prismSideMat]);
    this.scene.add(this.prism);
    this.disposables.push(prismGeom, this.prismMat, this.prismSideMat);

    // Aristas del tallado: las crestas del bisel dibujadas como líneas
    // aditivas — el contorno nítido que vende el cristal pulido.
    const edgeGeom = new THREE.EdgesGeometry(prismGeom, 28);
    this.edgeMat = new THREE.LineBasicMaterial({
      color: 0xf2ecff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgeGeom, this.edgeMat);
    edges.renderOrder = 6;
    this.scene.add(edges);
    this.disposables.push(edgeGeom, this.edgeMat);

    // ---------- Texturas compartidas ----------
    const glowTex = glowTexture(THREE);
    const beamTex = lightRamp(THREE, { core: 0.16, skirt: 0.42, skirtK: 0.3, head: 0.18, tail: 0.94 });
    const bandTex = lightRamp(THREE, { core: 0.2, skirt: 0.46, skirtK: 0.34, head: 0.035, tail: 0.88 });
    const bandCoreTex = lightRamp(THREE, { core: 0.12, skirt: 0.3, skirtK: 0.22, head: 0.025, tail: 0.9 });
    this.photonTex = photonTexture(THREE);
    this.disposables.push(glowTex, beamTex, bandTex, bandCoreTex, this.photonTex);

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
    // Del borde izquierdo del cuadro hasta DENTRO de la arista de entrada:
    // penetra un poco para que el contacto se vea, no que se corte en la
    // superficie.
    const beamX0 = sx(-50);
    const beamX1 = ENTRY_X + 0.55;
    const beamLen = beamX1 - beamX0;
    const beamGeom = new THREE.PlaneGeometry(beamLen, 1);
    const beamCx = (beamX0 + beamX1) / 2;
    this.beamCoreMat = additive(beamTex, 0xfff8ff, 1);
    const beamCore = new THREE.Mesh(beamGeom, this.beamCoreMat);
    beamCore.position.set(beamCx, BEAM_WY, 0.03);
    beamCore.scale.y = 0.26;
    this.beamHaloMat = additive(beamTex, 0xcdb8ff, 0.3);
    const beamHalo = new THREE.Mesh(beamGeom, this.beamHaloMat);
    beamHalo.position.set(beamCx, BEAM_WY, 0.01);
    beamHalo.scale.y = 1.3;
    const photonMat = additive(this.photonTex, 0xffffff, 0.9);
    this.photonMatRef = photonMat;
    const photons = new THREE.Mesh(beamGeom, photonMat);
    photons.position.set(beamCx, BEAM_WY, 0.05);
    photons.scale.y = 0.22;
    this.scene.add(beamCore, beamHalo, photons);
    this.disposables.push(beamGeom, this.beamCoreMat, this.beamHaloMat, photonMat);

    // Destello de contacto donde el haz toca la cara + halo sobre la cara.
    const flashMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xfff6ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.position.set(ENTRY_X - 0.05, BEAM_WY, FRONT_Z + 0.2);
    this.flash.scale.set(1.7, 0.6, 1); // flare horizontal a lo largo del haz, no bola
    this.scene.add(this.flash);
    this.disposables.push(flashMat);

    const entryGlowGeom = new THREE.PlaneGeometry(3.6, 1.4);
    this.entryGlowMat = additive(glowTex, 0xd9c8ff, 0.4);
    const entryGlow = new THREE.Mesh(entryGlowGeom, this.entryGlowMat);
    entryGlow.position.set(ENTRY_X + 0.02, BEAM_WY, FRONT_Z + 0.12);
    entryGlow.renderOrder = 3;
    this.scene.add(entryGlow);
    this.disposables.push(entryGlowGeom, this.entryGlowMat);

    // Franja de luz sobre la arista de entrada: la arista que recibe el haz
    // se enciende de punta a punta — define el borde izquierdo del prisma.
    const edgeAngleL = Math.atan2(AP.y - BL.y, AP.x - BL.x) - Math.PI / 2;
    const faceGlowGeom = new THREE.PlaneGeometry(0.55, 8.0);
    this.faceGlowMat = additive(glowTex, 0xb9a5ff, 0.2);
    const faceGlow = new THREE.Mesh(faceGlowGeom, this.faceGlowMat);
    faceGlow.position.set((AP.x + BL.x) / 2 - 0.04, (AP.y + BL.y) / 2, FRONT_Z + 0.1);
    faceGlow.rotation.z = edgeAngleL;
    faceGlow.renderOrder = 3;
    this.scene.add(faceGlow);
    this.disposables.push(faceGlowGeom, this.faceGlowMat);

    // Reflejo de ventana: una raya especular que cruza la cara frontal en
    // paralelo a la arista de salida — el destello largo del cristal pulido.
    const edgeAngleR = Math.atan2(BR.y - AP.y, BR.x - AP.x) + Math.PI / 2;
    const sheenGeom = new THREE.PlaneGeometry(1.4, 8.2);
    this.sheenMat = additive(glowTex, 0xf4edff, 0.1);
    const sheen = new THREE.Mesh(sheenGeom, this.sheenMat);
    sheen.position.set(-0.3, 0.1, FRONT_Z + 0.06);
    sheen.rotation.z = edgeAngleR * 0.55;
    sheen.renderOrder = 3;
    this.scene.add(sheen);
    this.disposables.push(sheenGeom, this.sheenMat);

    // ---------- Luz atrapada dentro del vidrio ----------
    // OPACA a propósito: el buffer de transmisión solo incluye opacos — esta
    // cuña es la luz que se ve refractada de verdad a través del sólido.
    // `alphaTest` descarta los bordes suaves del ramp sin pasar a la lista
    // transparente: halo dentro del cristal con bordes deshechos.
    // Nace en la arista de entrada y se abre hacia la arista de salida,
    // con los vértices teñidos de blanco → espectro (violeta arriba, verde
    // abajo): la dispersión sugerida adentro del cristal.
    const shaftGeom = new THREE.BufferGeometry();
    const inX = ENTRY_X + 0.22; // apenas adentro de la arista de entrada
    const eU = 0.5, eL = -0.42; // tramo de salida angosto: hilo de luz, no masa
    shaftGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          inX, BEAM_WY + 0.08, 0,
          inX, BEAM_WY - 0.08, 0,
          edgeR(eU) - 0.2, eU, 0,
          edgeR(eL) - 0.2, eL, 0,
        ]),
        3,
      ),
    );
    shaftGeom.setAttribute(
      "color",
      new THREE.BufferAttribute(
        new Float32Array([
          0.44, 0.41, 0.54, // entrada: luz ambiente tenue
          0.44, 0.41, 0.54,
          0.3, 0.18, 0.8, // arriba hacia el violeta
          0.16, 0.6, 0.4, // abajo hacia el verde-cian
        ]),
        3,
      ),
    );
    shaftGeom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2));
    shaftGeom.setIndex([0, 1, 2, 1, 3, 2]);
    this.shaftMat = new THREE.MeshBasicMaterial({
      map: bandTex,
      vertexColors: true,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
    });
    const shaft = new THREE.Mesh(shaftGeom, this.shaftMat);
    this.scene.add(shaft);
    this.disposables.push(shaftGeom, this.shaftMat);

    // Núcleo caliente: el haz refractado de verdad — un filete blanco que
    // entra por la arista y cruza hacia el medio de la cara de salida (opaco
    // → entra al buffer de transmisión; el alphaTest le deshace los bordes).
    const coreBeamGeom = new THREE.BufferGeometry();
    const exitMid = edgeR(-0.05) - 0.24;
    coreBeamGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          inX - 0.1, BEAM_WY + 0.08, 0.03,
          inX - 0.1, BEAM_WY - 0.08, 0.03,
          exitMid, -0.05 + 0.11, 0.03,
          exitMid, -0.05 - 0.14, 0.03,
        ]),
        3,
      ),
    );
    coreBeamGeom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2));
    coreBeamGeom.setIndex([0, 1, 2, 1, 3, 2]);
    this.coreBeamMat = new THREE.MeshBasicMaterial({
      map: bandTex,
      alphaTest: 0.03,
      side: THREE.DoubleSide,
    });
    this.coreBeamMat.color.setRGB(0.95, 0.88, 1.35);
    const coreBeam = new THREE.Mesh(coreBeamGeom, this.coreBeamMat);
    this.scene.add(coreBeam);
    this.disposables.push(coreBeamGeom, this.coreBeamMat);

    // Semilla brillante en la entrada: el punto donde la luz se hunde en el
    // cristal (opaco, también entra al buffer de transmisión). Un filo fino
    // a lo largo del haz — luz que entra, nunca una esfera.
    const seedGeom = new THREE.IcosahedronGeometry(0.13, 1);
    const seedMat = new THREE.MeshBasicMaterial();
    seedMat.color.setRGB(0.7, 0.62, 1.05);
    const seed = new THREE.Mesh(seedGeom, seedMat);
    seed.scale.set(4.2, 0.35, 1.0);
    seed.position.set(inX + 0.1, BEAM_WY, 0);
    this.scene.add(seed);
    this.disposables.push(seedGeom, seedMat);

    // Espectro dispersado a lo largo de la base: la dispersión que se acumula
    // contra el borde de abajo — una franja tenue violeta→verde apoyada en el
    // pie del monolito.
    const smearGeom = new THREE.BufferGeometry();
    const sX0 = BL.x + 0.5, sX1 = BR.x - 0.45;
    smearGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array([
          sX0, BL.y + 0.55, 0.02,
          sX0, BL.y + 0.12, 0.02,
          sX1, BR.y + 0.45, 0.02,
          sX1, BR.y + 0.08, 0.02,
        ]),
        3,
      ),
    );
    smearGeom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2));
    smearGeom.setIndex([0, 1, 2, 1, 3, 2]);
    const smearCv = document.createElement("canvas");
    smearCv.width = 128;
    smearCv.height = 16;
    const sctx = smearCv.getContext("2d");
    if (!sctx) throw new Error("2d");
    const sg = sctx.createLinearGradient(0, 0, 128, 0);
    sg.addColorStop(0, "#9945FF");
    sg.addColorStop(0.38, "#6C63FF");
    sg.addColorStop(0.68, "#00C2FF");
    sg.addColorStop(1, "#19FB9B");
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 128, 16);
    // perfil suave en ambos ejes para que los bordes se deshagan
    const smearImg = sctx.getImageData(0, 0, 128, 16);
    const sm = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    for (let y = 0; y < 16; y++) {
      const v = y / 15 - 0.5;
      const k = Math.exp(-(v * v) / 0.24);
      for (let x = 0; x < 128; x++) {
        const u = x / 127;
        smearImg.data[(y * 128 + x) * 4 + 3] = Math.round(255 * k * sm(0.04, 0.3, u) * (1 - sm(0.75, 0.98, u)));
      }
    }
    sctx.putImageData(smearImg, 0, 0);
    const smearTex = new THREE.CanvasTexture(smearCv);
    smearTex.colorSpace = THREE.SRGBColorSpace;
    this.smearMat = new THREE.MeshBasicMaterial({
      map: smearTex,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
    });
    this.smearMat.color.setScalar(0.16);
    const smear = new THREE.Mesh(smearGeom, this.smearMat);
    this.scene.add(smear);
    this.disposables.push(smearGeom, smearTex, this.smearMat);

    // ---------- Tarjeta refractora (opaca, solo detrás del vidrio) ----------
    // Panel chico detrás de la silueta del prisma: le da al pase de
    // transmisión luz real para refractar. Su alpha cae a cero mucho antes
    // del borde del quad y `alphaTest` descarta el resto — afuera del vidrio
    // se ve el fondo real de la página, sin rectángulo.
    const cardTex = refractorTexture(THREE);
    const cardGeom = new THREE.PlaneGeometry(5.9, 8.6);
    const cardMat = new THREE.MeshBasicMaterial({ map: cardTex, alphaTest: 0.02, toneMapped: false });
    const card = new THREE.Mesh(cardGeom, cardMat);
    card.position.set(-0.45, 0.2, -2.2);
    this.scene.add(card);
    this.disposables.push(cardTex, cardGeom, cardMat);

    // ---------- Charco de luz bajo el vidrio ----------
    // Ancla el prisma en el espacio: la luz que se derrama sobre la mesa
    // bajo la base del monolito.
    const poolGeom = new THREE.PlaneGeometry(7, 3.2);
    poolGeom.rotateX(-Math.PI / 2);
    this.poolMat = additive(glowTex, 0x8a6cff, 0.2);
    const pool = new THREE.Mesh(poolGeom, this.poolMat);
    pool.position.set(-0.5, -4.15, 0.4);
    this.scene.add(pool);
    this.disposables.push(poolGeom, this.poolMat);

    // Cáustica de espectro sobre la mesa: el arcoíris que el prisma proyecta
    // bajo el abanico — el detalle de foto que lo vuelve real.
    const smearCv2 = document.createElement("canvas");
    smearCv2.width = 128;
    smearCv2.height = 16;
    const sctx2 = smearCv2.getContext("2d");
    if (!sctx2) throw new Error("2d");
    const sg2 = sctx2.createLinearGradient(0, 0, 128, 0);
    sg2.addColorStop(0, "#9945FF");
    sg2.addColorStop(0.38, "#6C63FF");
    sg2.addColorStop(0.68, "#00C2FF");
    sg2.addColorStop(1, "#19FB9B");
    sctx2.fillStyle = sg2;
    sctx2.fillRect(0, 0, 128, 16);
    const cImg = sctx2.getImageData(0, 0, 128, 16);
    for (let y = 0; y < 16; y++) {
      const v = y / 15 - 0.5;
      const k = Math.exp(-(v * v) / 0.2);
      for (let x = 0; x < 128; x++) {
        const u = x / 127;
        cImg.data[(y * 128 + x) * 4 + 3] = Math.round(200 * k * Math.min(1, u * 3) * (1 - Math.max(0, (u - 0.7) / 0.3)));
      }
    }
    sctx2.putImageData(cImg, 0, 0);
    const causticFloorTex = new THREE.CanvasTexture(smearCv2);
    causticFloorTex.colorSpace = THREE.SRGBColorSpace;
    const causticFloorGeom = new THREE.PlaneGeometry(4.6, 1.6);
    causticFloorGeom.rotateX(-Math.PI / 2);
    this.causticFloorMat = additive(causticFloorTex, 0xffffff, 0.14);
    const causticFloor = new THREE.Mesh(causticFloorGeom, this.causticFloorMat);
    causticFloor.position.set(3.4, -3.9, 1.1);
    causticFloor.rotation.y = -0.12;
    this.scene.add(causticFloor);
    this.disposables.push(causticFloorGeom, causticFloorTex, this.causticFloorMat);

    // ---------- Cáustica interna ----------
    // Halo aditivo dentro del vidrio: deriva con el puntero como en el SVG.
    const causticMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xb99cff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.caustic = new THREE.Sprite(causticMat);
    this.caustic.position.set(-0.5, 0.1, FRONT_Z + 0.35);
    this.caustic.scale.set(5.6, 1.6, 1); // velo alargado en la dirección del haz
    this.scene.add(this.caustic);
    this.disposables.push(causticMat);

    // Destello del vértice: la chispa en la punta del monolito, donde las
    // aristas convergen — amarra la silueta de pie al haz que la atraviesa.
    const apexMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xe8dcff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    this.apex = new THREE.Sprite(apexMat);
    this.apex.position.set(AP.x + 0.06, AP.y - 0.2, FRONT_Z + 0.25);
    this.apex.scale.set(0.8, 0.8, 1);
    this.scene.add(this.apex);
    this.disposables.push(apexMat);

    // ---------- Polvo en el haz ----------
    // Motes que flotan en el volumen del haz y el abanico: la luz se siente.
    const DUST_N = 90;
    const dustPos = new Float32Array(DUST_N * 3);
    this.dustSpeed = new Float32Array(DUST_N);
    for (let i = 0; i < DUST_N; i++) {
      dustPos[i * 3] = sx(-50) + Math.random() * (sx(800) - sx(-50));
      dustPos[i * 3 + 1] = -3.5 + Math.random() * 7.5;
      dustPos[i * 3 + 2] = 0.3 + Math.random() * 2.4;
      this.dustSpeed[i] = 0.12 + Math.random() * 0.3;
    }
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    this.dustMat = new THREE.PointsMaterial({
      map: glowTex,
      color: 0xcabfff,
      size: 0.055,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.dust = new THREE.Points(dustGeom, this.dustMat);
    this.scene.add(this.dust);
    this.disposables.push(dustGeom, this.dustMat);

    // ---------- Pool de bandas de salida ----------
    for (let i = 0; i < MAX_BANDS; i++) {
      const coreMat = additive(bandCoreTex, 0xffffff, 1);
      const glowMat = additive(bandTex, 0xffffff, 0.4);
      const core = makeQuad(THREE, coreMat);
      const glow = makeQuad(THREE, glowMat);
      core.mesh.renderOrder = 4;
      glow.mesh.renderOrder = 3;
      core.mesh.visible = false;
      glow.mesh.visible = false;
      this.scene.add(core.mesh, glow.mesh);
      this.bandPool.push({
        core,
        glow,
        coreMat,
        glowMat,
        targetColor: new THREE.Color(0xffffff),
        currentColor: new THREE.Color(0xffffff),
      });
      this.disposables.push(core.mesh.geometry, glow.mesh.geometry, coreMat, glowMat);
    }

    // ---------- Rajadura grabada en la cara ----------
    // Línea quebrada sobre la cara frontal + su halo: la cuota vencida
    // tallada en el cristal. Baja por el centro del monolito de pie.
    const crackPts: THREE.Vector3[] = [];
    let cx = -0.55;
    for (let i = 0; i <= 9; i++) {
      const y = 1.6 - (i / 9) * 4.1;
      cx += (Math.sin(i * 2.7) * 0.5 + Math.sin(i * 7.3) * 0.24) * 0.11;
      crackPts.push(new THREE.Vector3(cx, y, FRONT_Z + 0.04));
    }
    // ramas de la rajadura
    const branch = [
      new THREE.Vector3(crackPts[3].x, crackPts[3].y, FRONT_Z + 0.04),
      new THREE.Vector3(crackPts[3].x + 0.45, crackPts[3].y + 0.3, FRONT_Z + 0.04),
      new THREE.Vector3(crackPts[3].x, crackPts[3].y, FRONT_Z + 0.04),
      new THREE.Vector3(crackPts[6].x, crackPts[6].y, FRONT_Z + 0.04),
      new THREE.Vector3(crackPts[6].x + 0.5, crackPts[6].y - 0.3, FRONT_Z + 0.04),
    ];
    const crackGeom = new THREE.BufferGeometry().setFromPoints(crackPts);
    const crackGlowGeom = new THREE.BufferGeometry().setFromPoints([...crackPts, ...branch]);
    const crackMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const crackGlowMat = new THREE.LineBasicMaterial({
      color: 0xb9a5ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.crackLine = new THREE.Line(crackGeom, crackMat);
    this.crackGlow = new THREE.Line(crackGlowGeom, crackGlowMat);
    this.crackLine.renderOrder = 5;
    this.crackGlow.renderOrder = 5;
    this.scene.add(this.crackLine, this.crackGlow);
    this.disposables.push(crackGeom, crackGlowGeom, crackMat, crackGlowMat);

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
    const { FAN_END_X } = STAGE_LAYOUT;
    const n = Math.min(bands.length, MAX_BANDS);
    const activeCount = bands.slice(0, n).filter((b) => b.on).length;
    let seen = 0;
    for (let i = 0; i < n; i++) {
      const b = bands[i];
      const bm = this.bandPool[i];
      if (!b.on) {
        bm.core.mesh.visible = false;
        bm.glow.mesh.visible = false;
        continue;
      }
      const bi = seen++;
      // Nace en la cara del vidrio (sobre el borde real, proyectado) y muere
      // en la punta del abanico — cada banda con su propio plano y deriva.
      const zFace = FRONT_Z + 0.18;
      const zTip = 0.5 + (bi - (activeCount - 1) / 2) * 0.22;
      const spanGlow = (lo: number, hi: number, k: number): [number, number] => {
        const m = ((hi - lo) * (k - 1)) / 2;
        return [lo - m, hi + m];
      };
      // Cara: borde del vidrio compensado al plano (sale "de" la arista).
      const [x0c, y0c] = lift(edgeX(sy(b.e0)), sy(b.e0), zFace);
      const [x1c, y1c] = lift(edgeX(sy(b.e1)), sy(b.e1), zFace);
      const [x2c, y2c] = lift(sx(FAN_END_X), sy(b.f0), zTip);
      const [x3c, y3c] = lift(sx(FAN_END_X), sy(b.f1), zTip);
      setQuad(bm.core, [x0c, y0c, zFace, x1c, y1c, zFace, x2c, y2c, zTip, x3c, y3c, zTip]);
      // Halo: mismo tramo agrandado — la falda suave alrededor del núcleo.
      const [g0, g1] = spanGlow(sy(b.e0), sy(b.e1), 2.1);
      const [g2, g3] = spanGlow(sy(b.f0), sy(b.f1), 1.7);
      const [gx0, gy0] = lift(edgeX(g0) - 0.15, g0, zFace - 0.06);
      const [gx1, gy1] = lift(edgeX(g1) - 0.15, g1, zFace - 0.06);
      const [gx2, gy2] = lift(sx(FAN_END_X) + 0.35, g2, zTip - 0.12);
      const [gx3, gy3] = lift(sx(FAN_END_X) + 0.35, g3, zTip - 0.12);
      setQuad(bm.glow, [gx0, gy0, zFace - 0.06, gx1, gy1, zFace - 0.06, gx2, gy2, zTip - 0.12, gx3, gy3, zTip - 0.12]);
      bm.core.mesh.visible = true;
      bm.glow.mesh.visible = true;
      bm.targetColor.set(b.color);
    }
    for (let i = n; i < MAX_BANDS; i++) {
      this.bandPool[i].core.mesh.visible = false;
      this.bandPool[i].glow.mesh.visible = false;
    }
  }

  setCracked(cracked: boolean) {
    this.crackedTarget = cracked ? 1 : 0;
  }

  /**
   * Pulso de re-refracción: el React lo llama cuando cambia el precio, el
   * producto o el escalón. El destello, la luz interna y las bandas laten
   * una vez mientras la luz se reparte de nuevo.
   */
  pulse() {
    this.pulseK = 1;
  }

  private onVisibility = () => {
    if (!document.hidden) this.kick();
  };

  private onPointer = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 0) {
      this.px = (e.clientX - r.left) / r.width;
      this.py = (e.clientY - r.top) / r.height;
      this.ndc.set(this.px * 2 - 1, -(this.py * 2 - 1));
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
    this.frames++;

    // La energía del puntero decae; el pulso late una vez; la escena respira.
    this.energyTarget *= 0.9;
    this.energy = Math.max(this.energy * 0.95, this.energyTarget);
    this.pulseK *= Math.exp(-dt * 3.2);
    if (this.pulseK < 0.01) this.pulseK = 0;
    this.crackedK += (this.crackedTarget - this.crackedK) * Math.min(1, dt * 7);

    // Hover sobre el vidrio (raycast cada 3 frames): el cristal se enciende.
    if (this.frames % 3 === 0) {
      this.raycaster.setFromCamera(this.ndc, this.camera);
      this.hoverTarget = this.raycaster.intersectObject(this.prism, false).length > 0 ? 1 : 0;
    }
    this.hoverK += (this.hoverTarget - this.hoverK) * Math.min(1, dt * 8);

    // Cámara: parallax mínimo con el puntero (la luz se mueve, el vidrio no).
    this.camera.position.x = CAM.x + (this.px - 0.5) * 0.55;
    this.camera.position.y = CAM.y + (this.py - 0.5) * -0.42;
    this.camera.lookAt(CAM.lookX, CAM.lookY, 0);

    // El puntero dirige la luz principal: los reflejos barren el cristal.
    this.keyLight.position.x = -5 + (this.px - 0.5) * 3.4;
    this.keyLight.position.y = 7 + (0.5 - this.py) * 2.6;
    this.violetLight.intensity = 6 + this.energy * 5 + this.hoverK * 6 + this.pulseK * 4;
    this.cyanLight.intensity = 5 + this.pulseK * 4 + this.energy * 2;

    // Rajado: el vidrio se apaga, se empasta y pierde espectro.
    this.prismMat.roughness = 0.04 + this.crackedK * 0.3;
    this.prismMat.envMapIntensity = 0.5 + this.hoverK * 0.3 + this.pulseK * 0.35 - this.crackedK * 0.3;
    this.prismMat.iridescence = 0.07 * (1 - this.crackedK * 0.75);
    this.prismMat.dispersion = 0.55 * (1 - this.crackedK * 0.6);
    this.edgeMat.opacity =
      (0.5 + this.hoverK * 0.5 + this.energy * 0.25 + this.pulseK * 0.35) * (1 - this.crackedK * 0.4);
    (this.crackLine.material as THREE.LineBasicMaterial).opacity = this.crackedK * 0.9;
    (this.crackGlow.material as THREE.LineBasicMaterial).opacity =
      this.crackedK * (0.3 + 0.15 * Math.sin(now * 2.4));

    // Haz entrante: respira con la energía y tiembla apenas con el pulso.
    this.beamCoreMat.opacity =
      (0.95 + this.energy * 0.3 + this.pulseK * 0.4 + 0.04 * Math.sin(now * 7.7)) * (1 - this.crackedK * 0.35);
    this.beamHaloMat.opacity = (0.34 + this.energy * 0.2 + this.pulseK * 0.3) * (1 - this.crackedK * 0.4);
    if (this.photonMatRef) this.photonMatRef.opacity = (0.75 + this.energy * 0.5) * (1 - this.crackedK * 0.5);

    // Destello de contacto y halo sobre la cara de entrada.
    (this.flash.material as THREE.SpriteMaterial).opacity =
      (0.6 + 0.3 * this.energy + 0.12 * Math.sin(now * 1.9) + this.pulseK * 0.5) * (1 - this.crackedK * 0.45);
    const flashScale = 1.05 * (1 + this.pulseK * 0.35 + this.energy * 0.15);
    this.flash.scale.set(flashScale * 1.9, flashScale * 0.6, 1); // flare, no bola
    this.entryGlowMat.opacity =
      (0.28 + this.energy * 0.22 + this.pulseK * 0.4 + this.hoverK * 0.2) * (1 - this.crackedK * 0.55);
    this.faceGlowMat.opacity = (0.18 + this.hoverK * 0.2 + this.pulseK * 0.25) * (1 - this.crackedK * 0.5);
    // La raya especular barre el vidrio con el puntero.
    this.sheenMat.opacity =
      (0.08 + this.energy * 0.1 + this.hoverK * 0.16 + this.pulseK * 0.15) * (1 - this.crackedK * 0.5);
    (this.apex.material as THREE.SpriteMaterial).opacity =
      (0.55 + this.energy * 0.35 + this.pulseK * 0.6 + this.hoverK * 0.2) * (1 - this.crackedK * 0.5);

    // La luz atrapada late con el pulso: se ve refractada a través del vidrio.
    // Teñida a violeta frío — nunca blanco puro, así el cristal no empasta.
    const shaftK = 0.5 + this.energy * 0.18 + this.pulseK * 0.4 + this.hoverK * 0.22 - this.crackedK * 0.3;
    this.shaftMat.color.setRGB(shaftK * 0.85, shaftK * 0.74, shaftK);
    this.coreBeamMat.color.setRGB(
      (0.95 + this.energy * 0.25 + this.pulseK * 0.5) * (1 - this.crackedK * 0.4),
      (0.88 + this.energy * 0.25 + this.pulseK * 0.5) * (1 - this.crackedK * 0.4),
      (1.35 + this.energy * 0.25 + this.pulseK * 0.5) * (1 - this.crackedK * 0.35),
    );
    this.smearMat.color.setScalar(
      (0.16 + 0.04 * Math.sin(now * 1.3) + this.pulseK * 0.15 + this.hoverK * 0.1) * (1 - this.crackedK * 0.5),
    );

    // Cáustica: deriva con el puntero como en el SVG.
    this.caustic.position.x = -0.5 + (this.px - 0.45) * 1.4;
    this.caustic.position.y = 0.1 + (this.py - 0.45) * 1.8;
    (this.caustic.material as THREE.SpriteMaterial).opacity =
      (0.1 + this.energy * 0.16 + this.hoverK * 0.12 + this.pulseK * 0.2) * (1 - this.crackedK * 0.55);

    // Charco de luz y cáustica de mesa: respiran suave.
    this.poolMat.opacity = (0.15 + this.energy * 0.08 + this.pulseK * 0.12) * (1 - this.crackedK * 0.4);
    this.causticFloorMat.opacity = (0.13 + this.pulseK * 0.12 + this.energy * 0.06) * (1 - this.crackedK * 0.6);

    // Fotones viajando al vidrio + polvo a la deriva.
    this.photonTex.offset.x = (this.photonTex.offset.x - dt * 0.6) % 1;
    const dp = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = dp.array as Float32Array;
    for (let i = 0; i < this.dustSpeed.length; i++) {
      arr[i * 3] += this.dustSpeed[i] * dt * (0.5 + this.energy);
      arr[i * 3 + 1] += Math.sin(now * 0.6 + i * 1.7) * dt * 0.06;
      if (arr[i * 3] > sx(800)) arr[i * 3] = sx(-50);
    }
    dp.needsUpdate = true;
    this.dustMat.opacity = (0.3 + this.energy * 0.5 + this.hoverK * 0.2) * (1 - this.crackedK * 0.5);

    // Bandas: brillo respirando; el color se apaga al rajarse.
    const dim = 1 - this.crackedK * 0.3;
    let vi = 0;
    for (const b of this.bandPool) {
      if (!b.core.mesh.visible) continue;
      const i = vi++;
      const lum = b.targetColor.r * 0.3 + b.targetColor.g * 0.4 + b.targetColor.b * 0.3;
      const sat = 1 - this.crackedK * 0.8;
      b.currentColor.setRGB(
        lum + (b.targetColor.r - lum) * sat,
        lum + (b.targetColor.g - lum) * sat,
        lum + (b.targetColor.b - lum) * sat,
      );
      const breathe = 0.9 + 0.1 * Math.sin(now * 5 + i * 1.7);
      const k = dim * breathe * (1 + this.energy * 0.25 + this.pulseK * 0.4);
      b.coreMat.color.copy(b.currentColor);
      b.glowMat.color.copy(b.currentColor);
      b.coreMat.opacity = 0.95 * k;
      b.glowMat.opacity = 0.38 * k;
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
