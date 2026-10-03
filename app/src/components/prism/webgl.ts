import type { PrismGeom } from "./layout";

/**
 * Renderer WebGL del prisma: dibuja solo LUZ (haz, dispersión, bandas,
 * marcas) sobre un canvas transparente. El vidrio físico es el .slab del
 * DOM que queda detrás — la luz se mueve, el vidrio no.
 *
 * - Las bandas se reordenan con una transición de 600ms ease-out cuando
 *   cambian los montos (la luz viaja, sin rebote).
 * - u_energy responde a la velocidad del puntero y del scroll.
 * - Se pausa fuera de pantalla (IntersectionObserver) y con la pestaña oculta.
 */

const MAX_BANDS = 8;
const TRANSITION_MS = 600;
const DPR_CAP = 1.75;

const VERT = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_energy;
uniform vec4 u_slab;          // x0,y0,x1,y1 normalizados, y hacia abajo
uniform vec2 u_input;         // y, halfTh del haz entrante
uniform int u_nb;
uniform vec4 u_bands[${MAX_BANDS}]; // x0, y, th, x1
uniform vec3 u_bcol[${MAX_BANDS}];
uniform float u_bst[${MAX_BANDS}];  // 0 ninguna, 1 cracked, 2 refilled, 3 etched
uniform vec4 u_cmp;           // x0, y, th, x1 (haz gris de la alternativa)

#define ASP (u_res.x / u_res.y)

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float g(float d, float s){ return exp(-d*d/(s*s)); }
float segd(vec2 p, vec2 a, vec2 b){
  vec2 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-6), 0.0, 1.0);
  return length(pa-ba*h);
}

void main(){
  vec2 p = vec2(gl_FragCoord.x/u_res.x, 1.0 - gl_FragCoord.y/u_res.y);
  vec2 q = vec2(p.x, p.y*ASP);
  vec3 col = vec3(0.0);
  float shim = 1.0 + u_energy*(0.05*sin(q.x*30.0 - u_time*7.0) + 0.05*sin(q.y*41.0 + u_time*5.0));

  // ---------- haz entrante: núcleo blanco, borde violeta/cian ----------
  {
    float cy = u_input.x*ASP, th = u_input.y*ASP;
    float inx = step(0.0, q.x)*step(q.x, u_slab.x);
    float fade = smoothstep(0.0, 0.06, q.x);
    float d = abs(q.y - cy);
    col += vec3(1.0,0.98,1.0) * g(d, th*0.55) * 1.1 * inx * fade * shim;
    col += vec3(0.6,0.27,1.0) * g(d - th*0.9, th*0.8) * 0.22 * inx * fade;
    col += vec3(0.0,0.76,1.0) * g(d + th*0.9, th*0.8) * 0.22 * inx * fade;
    col += vec3(0.6,0.3,1.0)  * g(d, th*4.5) * 0.10 * inx * fade * (0.6+u_energy*0.8);
  }

  float inSlab = step(u_slab.x,q.x)*step(q.x,u_slab.z)*step(u_slab.y*ASP,q.y)*step(q.y,u_slab.w*ASP);

  // ---------- bruma cáustica dentro del vidrio (la luz respira) ----------
  float caus = noise(q*vec2(9.0,6.0) + vec2(u_time*0.10, -u_time*0.06));
  vec3 haze = mix(vec3(0.6,0.27,1.0), vec3(0.1,0.98,0.61), clamp(q.y/ASP,0.0,1.0));
  col += haze * (0.04 + 0.12*caus) * inSlab * (0.8 + 0.6*u_energy);

  for (int i = 0; i < ${MAX_BANDS}; i++) {
    if (i >= u_nb) break;
    vec4 b = u_bands[i];
    vec3 bc = u_bcol[i];
    float st = u_bst[i];
    float th = max(b.z*ASP, 1e-4);
    float cy = b.y*ASP;

    // rayo disperso dentro del vidrio: entrada -> salida de esta banda
    float rd = segd(q, vec2(u_slab.x, u_input.x*ASP), vec2(u_slab.z, cy));
    col += bc * g(rd, th*1.9) * 0.30 * inSlab;
    col += vec3(1.0) * g(rd, th*0.7) * 0.08 * inSlab;

    // ---------- banda espectral ----------
    float inb = step(b.x, q.x)*step(q.x, b.w);
    float d = abs(q.y - cy);

    if (st == 2.0) col += vec3(0.6,0.27,1.0) * g(d, th*5.0) * 0.5 * inb;

    vec3 band = bc * g(d, th) * 0.85
              + vec3(1.0) * g(d, th*0.5) * 0.7
              + bc * g(d, th*3.5) * (0.14 + u_energy*0.15);
    // franjas cromáticas en los bordes de la banda
    band += vec3(0.6,0.27,1.0) * g(q.y - (cy + th*1.6), th*0.6) * 0.10;
    band += vec3(0.1,0.9,0.7)  * g(q.y - (cy - th*1.6), th*0.6) * 0.10;

    if (st == 3.0) {           // etched: rayado fino, desaturado, hundido
      float hatch = smoothstep(0.80, 0.97, sin((q.x*ASP - q.y)*120.0));
      float lum = dot(band, vec3(0.35));
      band = mix(band * (0.30 + 0.70*hatch), vec3(lum)*0.55, 0.5);
    }
    if (st == 1.0) {           // cracked: grieta irregular, banda apagada
      float u = (q.x - b.x) / max(b.w - b.x, 1e-4);
      float z = abs(sin(u*19.0)*0.55 + sin(u*43.0+2.7)*0.30 + sin(u*91.0+1.3)*0.15);
      float v = (q.y - cy) / th;
      float crack = smoothstep(0.12, 0.0, abs(v - (z*1.6 - 0.8)));
      band *= (1.0 - 0.8*crack) * 0.55;
      band += vec3(1.0,0.55,0.62) * crack * 0.14;
    }
    if (st == 2.0) band *= 1.3;

    col += band * inb * shim;
  }

  // ---------- destello donde el haz entra al vidrio ----------
  col += vec3(1.0,0.95,1.0) * g(length(q - vec2(u_slab.x, u_input.x*ASP)), 0.014*ASP)
       * (0.45 + 0.55*u_energy + 0.12*sin(u_time*1.7));

  // ---------- la alternativa: un solo haz gris, más largo ----------
  if (u_cmp.w > u_cmp.x) {
    float inx = step(u_cmp.x, q.x)*step(q.x, u_cmp.w);
    float d = abs(q.y - u_cmp.y*ASP);
    float th = u_cmp.z*ASP;
    float fade = smoothstep(u_cmp.x, u_cmp.x + 0.06, q.x);
    col += vec3(0.85,0.86,0.90) * g(d, th*0.4) * 0.5 * inx * fade;
    col += vec3(0.545,0.573,0.663) * g(d, th) * 0.55 * inx * fade;
    col += vec3(0.545,0.573,0.663) * g(d, th*3.5) * 0.10 * inx * (0.6+u_energy*0.6);
  }

  // dither sutil contra banding
  col += (hash(q + vec2(fract(u_time))) - 0.5) * 0.014;

  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) throw new Error("shader");
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`${type === gl.VERTEX_SHADER ? "vert" : "frag"}: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

interface Packed {
  slab: [number, number, number, number];
  input: [number, number];
  bands: Float32Array; // 4 * MAX_BANDS
  cols: Float32Array; // 3 * MAX_BANDS
  st: Float32Array; // MAX_BANDS
  nb: number;
  cmp: [number, number, number, number];
}

function pack(geom: PrismGeom): Packed {
  const bands = new Float32Array(MAX_BANDS * 4);
  const cols = new Float32Array(MAX_BANDS * 3);
  const st = new Float32Array(MAX_BANDS);
  const nb = Math.min(geom.bands.length, MAX_BANDS);
  for (let i = 0; i < nb; i++) {
    const b = geom.bands[i];
    bands.set([b.x0, b.y, b.th, b.x1], i * 4);
    cols.set(b.color, i * 3);
    st[i] = b.mark === "cracked" ? 1 : b.mark === "refilled" ? 2 : b.mark === "etched" ? 3 : 0;
  }
  return {
    slab: [geom.slab.x0, geom.slab.y0, geom.slab.x1, geom.slab.y1],
    input: [geom.input.y, geom.input.th],
    bands,
    cols,
    st,
    nb,
    cmp: [geom.comparison.x0, geom.comparison.y, geom.comparison.th, geom.comparison.x1],
  };
}

/** Fusiona la geometría anterior con la nueva para animar la transición. */
function blend(from: Packed, to: Packed, t: number): Packed {
  const L = (a: number, b: number) => a + (b - a) * t;
  const out = pack2empty();
  out.slab = from.slab.map((v, i) => L(v, to.slab[i])) as Packed["slab"];
  out.input = [L(from.input[0], to.input[0]), L(from.input[1], to.input[1])];
  out.nb = to.nb;
  for (let i = 0; i < to.nb; i++) {
    for (let k = 0; k < 4; k++) {
      // una banda nueva nace con largo cero en la cara del vidrio
      const fv = i < from.nb ? from.bands[i * 4 + k] : to.bands[i * 4 + (k === 3 ? 0 : k)];
      out.bands[i * 4 + k] = L(fv, to.bands[i * 4 + k]);
    }
    for (let k = 0; k < 3; k++) {
      const fv = i < from.nb ? from.cols[i * 3 + k] : to.cols[i * 3 + k];
      out.cols[i * 3 + k] = L(fv, to.cols[i * 3 + k]);
    }
    out.st[i] = to.st[i];
  }
  out.cmp = from.cmp.map((v, i) => L(v, to.cmp[i])) as Packed["cmp"];
  return out;
}
function pack2empty(): Packed {
  return {
    slab: [0, 0, 0, 0],
    input: [0, 0],
    bands: new Float32Array(MAX_BANDS * 4),
    cols: new Float32Array(MAX_BANDS * 3),
    st: new Float32Array(MAX_BANDS),
    nb: 0,
    cmp: [0, 0, 0, 0],
  };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Misma geometría (posiciones y colores): las marcas no cuentan. */
function sameGeometry(a: Packed, b: Packed) {
  const eq = (x: ArrayLike<number>, y: ArrayLike<number>) => {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  };
  return (
    a.nb === b.nb &&
    eq(a.slab, b.slab) &&
    eq(a.input, b.input) &&
    eq(a.bands, b.bands) &&
    eq(a.cols, b.cols) &&
    eq(a.cmp, b.cmp)
  );
}

export class PrismRenderer {
  static tryCreate(canvas: HTMLCanvasElement): PrismRenderer | null {
    try {
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        powerPreference: "low-power",
      });
      if (!gl || gl.isContextLost()) return null;
      return new PrismRenderer(canvas, gl);
    } catch (e) {
      console.warn("[prism] renderer no disponible:", e);
      return null;
    }
  }

  private prog: WebGLProgram;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private visible = true;
  private cur: Packed;
  private from: Packed;
  private to: Packed;
  private t0 = 0;
  private energy = 0;
  private energyTarget = 0;
  private lastPointer: { x: number; y: number; t: number } | null = null;
  private lastScroll: { y: number; t: number } | null = null;
  private disposed = false;

  private constructor(private canvas: HTMLCanvasElement, private gl: WebGLRenderingContext) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!prog) throw new Error("program");
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    }
    this.prog = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    for (const name of ["u_res", "u_time", "u_energy", "u_slab", "u_input", "u_nb", "u_bands", "u_bcol", "u_bst", "u_cmp"]) {
      this.loc[name] = gl.getUniformLocation(prog, name);
    }

    this.cur = this.from = this.to = pack2empty();

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

  setGeometry(geom: PrismGeom) {
    const now = performance.now();
    const next = pack(geom);
    if (this.t0 && sameGeometry(this.to, next)) {
      // solo cambiaron marcas (o nada): se actualizan sin re-disparar la transición
      this.to = next;
      this.kick();
      return;
    }
    // anima desde el estado actual (donde quedó la transición anterior)
    const elapsed = this.t0 ? Math.min(1, (now - this.t0) / TRANSITION_MS) : 1;
    this.cur = elapsed < 1 ? blend(this.from, this.to, easeOutCubic(elapsed)) : this.to;
    this.from = this.cur;
    this.to = next;
    this.t0 = now;
    this.kick();
  }

  private onVisibility = () => {
    if (!document.hidden) this.kick();
  };
  private onPointer = (e: PointerEvent) => {
    const now = performance.now();
    if (this.lastPointer) {
      const dt = Math.max(1, now - this.lastPointer.t);
      const d = Math.hypot(e.clientX - this.lastPointer.x, e.clientY - this.lastPointer.y);
      this.energyTarget = Math.min(1, Math.max(this.energyTarget, (d / dt) / 6));
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
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    this.kick();
  }

  /** Despierta el loop si está visible. */
  private kick() {
    if (this.raf === 0 && this.visible && !document.hidden && !this.disposed) {
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (!this.visible || document.hidden || this.disposed) return;

    // decaimiento de la energía: la luz se calma
    this.energyTarget *= 0.90;
    this.energy = Math.max(this.energy * 0.95, this.energyTarget);

    const t = Math.min(1, (now - this.t0) / TRANSITION_MS);
    this.cur = t < 1 ? blend(this.from, this.to, easeOutCubic(t)) : this.to;
    this.draw(this.cur, now / 1000);

    // sigue dibujando: el mundo respira (cáusticas lento) — costo: un quad
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw(pk: Packed, time: number) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    gl.uniform2f(this.loc.u_res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.loc.u_time, time);
    gl.uniform1f(this.loc.u_energy, this.energy);
    gl.uniform4fv(this.loc.u_slab, pk.slab);
    gl.uniform2fv(this.loc.u_input, pk.input);
    gl.uniform1i(this.loc.u_nb, pk.nb);
    gl.uniform4fv(this.loc.u_bands, pk.bands);
    gl.uniform3fv(this.loc.u_bcol, pk.cols);
    gl.uniform1fv(this.loc.u_bst, pk.st);
    gl.uniform4fv(this.loc.u_cmp, pk.cmp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("scroll", this.onScroll, true);
    // no loseContext: React Strict Mode remonta el efecto sobre el mismo
    // canvas y getContext devolvería un contexto muerto.
  }
}
