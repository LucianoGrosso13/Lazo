export const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Analytic glass sphere holding liquid light: a single triangle, no
// ray-marching, textures, allocations per frame or additional 3D dependencies.
// The light is a function of the 3D point on the sphere, so it has no seams or
// poles, and it is shaded twice (near and far hemisphere) under one rotation:
// the two layers cross each other, which is what reads as volume.
export const FRAGMENT = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_loan;
uniform float u_energy;
uniform vec3 u_green, u_cyan, u_violet, u_backlight, u_beam;
float glow(float d, float width) { return exp(-d*d/(width*width)); }
mat3 spin(float t) {
  float a = t*0.34;
  float b = 0.5 + 0.32*sin(t*0.21);
  float ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
  return mat3(1.0, 0.0, 0.0, 0.0, cb, sb, 0.0, -sb, cb) * mat3(ca, 0.0, -sa, 0.0, 1.0, 0.0, sa, 0.0, ca);
}
// Twice domain-warped sines: currents that fold into each other like liquid.
float flow(vec3 q, float t) {
  q += 0.5*sin(q.yzx*2.1 + t*0.47);
  q += 0.27*sin(q.zxy*3.9 - t*0.36);
  return sin(q.x*2.3 + t*0.29) + sin(q.y*2.8 - t*0.23) + sin(q.z*2.0 + t*0.19);
}
vec3 shade(vec3 q, float t, out vec3 tint) {
  float f = flow(q, t);
  // The projection of a sphere on any axis is uniform over its surface, so
  // this cap covers exactly u_loan of the area; the current only frays its edge.
  float share = 0.5 + 0.5*q.y + 0.035*f;
  float loan = 1.0 - smoothstep(u_loan - 0.04, u_loan + 0.04, share);
  // Explicit endpoints: no violet loan cap at 0%, no green one at 100%.
  loan = u_loan < 0.001 ? 0.0 : (u_loan > 0.999 ? 1.0 : loan);
  vec3 available = mix(u_green, u_cyan, 0.3 + 0.3*sin(f*1.1 + q.x*1.7));
  vec3 borrowed = mix(u_violet, u_backlight, 0.34 + 0.3*sin(f*1.3 - q.z*1.9));
  tint = mix(available, borrowed, loan);
  float body = smoothstep(-0.9, 2.3, f);
  float veins = glow(f, 0.24) + 0.5*glow(f - 1.25, 0.2);
  return tint*(body*0.46 + veins*0.74) + mix(tint, u_beam, 0.55)*pow(veins, 3.0)*0.26;
}
void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y);
  // The sphere breathes instead of sitting still between two frames.
  p /= 0.79*(1.0 + 0.012*sin(u_time*0.9));
  float r = length(p);
  float mask = 1.0 - smoothstep(0.991, 1.007, r);
  float z = sqrt(max(0.0, 1.0 - dot(p,p)));
  mat3 turn = spin(u_time);
  vec3 nearTint, farTint;
  vec3 near = shade(turn*vec3(p, z), u_time, nearTint);
  vec3 far = shade(turn*vec3(p, -z), u_time + 7.0, farTint);
  float rim = pow(1.0-z, 3.0);
  float power = 0.2 + u_energy*0.8;
  // The far side is seen through the glass: dimmer, and lost towards the centre.
  vec3 col = (near*(0.35 + 0.65*z) + far*0.42*(1.0 - 0.45*z)) * power;
  col += nearTint * (0.02 + rim*0.2);
  // A soft core, so the light gathers inside instead of being painted on.
  col += mix(nearTint, u_beam, 0.35) * glow(r, 0.42)*0.1*power;
  // One fixed reflected window makes the glass solid while only light moves.
  col += u_beam * glow(length(p-vec2(-0.3,0.52)), 0.1)*0.22;
  col += u_backlight * glow(r-0.982, 0.018)*(0.2 + 0.1*sin(atan(p.y,p.x)*2.0 + u_time*0.3));
  float outside = glow(r-1.0, 0.09)*0.05*(1.0-mask);
  col = col*mask + nearTint*outside*power;
  gl_FragColor = vec4(col, clamp(max(max(col.r,col.g),col.b), 0.0, 1.0));
}
`;
