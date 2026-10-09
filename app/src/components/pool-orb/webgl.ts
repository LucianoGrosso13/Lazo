import { FRAGMENT, VERTEX } from "./shaders";
import type { OrbState } from "./state";

/** Uses the prism/webgl.ts full-screen triangle and DPR cap, with the same
 * resize/visibility lifecycle as landing/gpu-fog.tsx. Lifecycle is owned by
 * PoolOrb so it also pauses the CSS renderer when WebGL is unavailable. */
export function createOrbRenderer(canvas: HTMLCanvasElement, state: OrbState) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl || gl.isContextLost()) return null;
  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const dispose = () => {
    shaders.forEach(shader => gl.deleteShader(shader));
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
  };
  try {
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("compile");
      return shader;
    };
    program = gl.createProgram();
    if (!program) throw new Error("program");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const loc = (name: string) => gl.getUniformLocation(program!, name);
    const resolution = loc("u_res");
    const time = loc("u_time");
    gl.uniform1f(loc("u_loan"), state.prestadoRatio);
    gl.uniform1f(loc("u_energy"), state.intensidad);
    const css = getComputedStyle(canvas);
    for (const name of ["green", "cyan", "violet", "backlight", "beam"]) {
      // Palette belongs to globals.css, including when used inside a nested role.
      const hex = css.getPropertyValue(`--color-${name}`).trim().replace("#", "");
      if (!/^[\da-f]{6}$/i.test(hex)) throw new Error("palette");
      const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
      gl.uniform3f(loc(`u_${name}`), rgb[0], rgb[1], rgb[2]);
    }
    return {
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
      },
      draw(seconds: number) {
        if (gl.isContextLost()) return false;
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, seconds);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
