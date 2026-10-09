export const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Analytic sphere + spherical ribbons: a single triangle, no ray-marching,
// textures, allocations per frame or additional 3D dependencies.
export const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_loan;
uniform float u_energy;
uniform vec3 u_green, u_cyan, u_violet, u_backlight, u_beam;
const float PI = 3.14159265359;
float glow(float d, float width) { return exp(-d*d/(width*width)); }
void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y);
  p /= 0.79;
  float r = length(p);
  float mask = 1.0 - smoothstep(0.991, 1.007, r);
  float z = sqrt(max(0.0, 1.0 - dot(p,p)));
  vec3 n = vec3(p, z);
  float angle = atan(p.y,p.x);
  float sector = (angle + PI) / (2.0 * PI);
  float loan = 1.0 - smoothstep(u_loan - 0.012, u_loan + 0.012, sector);
  // Explicit endpoints: no violet loan slice at 0%, no green slice at 100%.
  loan = u_loan < 0.001 ? 0.0 : (u_loan > 0.999 ? 1.0 : loan);
  vec3 available = mix(u_green, u_cyan, 0.32 + 0.23*sin(angle*2.0));
  vec3 borrowed = mix(u_violet, u_backlight, 0.28 + 0.16*cos(angle));
  vec3 tint = mix(available, borrowed, loan);
  float rim = pow(1.0-z, 3.0);
  vec3 col = tint * (0.023 + rim*0.17);
  float ribbons = 0.0;
  float mist = 0.0;
  for (int i=0; i<4; i++) {
    float f = float(i);
    float phase = u_time * (0.18 + f*0.025) + f*1.46;
    vec3 axis = normalize(vec3(cos(phase), sin(phase)*0.75, 0.35 + 0.28*sin(phase*0.7+f)));
    float warp = sin(angle*3.0 + z*5.0 - u_time*0.38 + f)*0.095;
    float d = dot(n, axis) + warp;
    float front = 0.3 + 0.7*z;
    ribbons += glow(d, 0.028 + f*0.008)*front;
    mist += glow(d, 0.12)*front;
  }
  col += tint * (ribbons*0.95 + mist*0.18) * (0.18+u_energy*0.82);
  col += mix(u_backlight, u_beam, 0.65) * pow(ribbons*0.24, 3.0)*0.8;
  // Two fixed reflected windows make the glass solid while only light rotates.
  col += u_beam * glow(length(p-vec2(-0.28,0.53)), 0.09)*0.3;
  col += u_backlight * glow(r-0.982, 0.018)*(0.18+0.12*sin(angle*2.0));
  float outside = glow(r-1.0, 0.08)*0.025*(1.0-mask);
  col = col*mask + tint*outside*u_energy;
  gl_FragColor = vec4(col, clamp(max(max(col.r,col.g),col.b), 0.0, 1.0));
}
`;
