import { COMMON_WGSL } from './common.wgsl';

/** 洞体与步道等普通 mesh：position+normal 交错顶点，uniform 给 baseColor。 */
export const BASIC_MESH_WGSL = {
  vertex: /* wgsl */ `
${COMMON_WGSL}
struct Model { matrix: mat4x4<f32>, color: vec4<f32> };
@group(0) @binding(1) var<uniform> model: Model;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
};

@vertex
fn vsMain(@location(0) position: vec3<f32>, @location(1) normal: vec3<f32>) -> VSOut {
  var out: VSOut;
  let world = model.matrix * vec4<f32>(position, 1.0);
  out.worldPos = world.xyz;
  out.normal = (model.matrix * vec4<f32>(normal, 0.0)).xyz;
  out.clip = globals.camera.viewProj * world;
  return out;
}
`,
  fragment: /* wgsl */ `
${COMMON_WGSL}
struct Model { matrix: mat4x4<f32>, color: vec4<f32> };
@group(0) @binding(1) var<uniform> model: Model;

@fragment
fn fsMain(@location(0) worldPos: vec3<f32>, @location(1) normal: vec3<f32>) -> @location(0) vec4<f32> {
  applyClip(worldPos);
  return shade(model.color.rgb, worldPos, normal);
}
`,
};
