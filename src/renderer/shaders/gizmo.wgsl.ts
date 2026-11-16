import { COMMON_WGSL } from './common.wgsl';

/** 灯光 gizmo 与批注标记：billboard 小球/标记，始终面向相机。 */
export const GIZMO_WGSL = {
  vertex: /* wgsl */ `
${COMMON_WGSL}
struct Gizmo {
  position: vec4<f32>, // xyz, w = 半径
  color: vec4<f32>,
};
@group(0) @binding(1) var<storage, read> gizmos: array<Gizmo>;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) color: vec3<f32>,
  @location(1) local: vec2<f32>,
  @builtin(instance_index) ii: u32,
};

@vertex
fn vsMain(@location(0) corner: vec2<f32>, @builtin(instance_index) ii: u32) -> VSOut {
  let g = gizmos[ii];
  let right = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), normalize(g.position.xyz - globals.camera.eye)));
  let upV = cross(normalize(globals.camera.eye - g.position.xyz), right);
  let world = vec4<f32>(g.position.xyz + right * corner.x * g.position.w + upV * corner.y * g.position.w, 1.0);
  var out: VSOut;
  out.clip = globals.camera.viewProj * world;
  out.color = g.color.rgb;
  out.local = corner;
  out.ii = ii;
  return out;
}
`,
  fragment: /* wgsl */ `
${COMMON_WGSL}
@fragment
fn fsMain(@location(0) color: vec3<f32>, @location(1) local: vec2<f32>) -> @location(0) vec4<f32> {
  let r2 = dot(local, local);
  if (r2 > 1.0) { discard; }
  let rim = 1.0 - smoothstep(0.75, 1.0, sqrt(r2));
  return vec4<f32>(color * (0.6 + 0.4 * rim), 1.0);
}
`,
};
