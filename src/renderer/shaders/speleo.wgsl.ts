import { COMMON_WGSL } from './common.wgsl';

/**
 * 钟乳石实例化：3 个档位原型 mesh + 每实例 buffer。
 * 实例属性：root、axis、height、radius、shapeSeed、tierColor、tierIndex。
 */
export const SPELEO_WGSL = {
  vertex: /* wgsl */ `
${COMMON_WGSL}
struct Instance {
  root: vec4<f32>,       // xyz 根部, w = height
  axisRadius: vec4<f32>, // xyz 轴向, w = radius
  colorSeed: vec4<f32>,  // rgb 颜色, w = shapeSeed
};
@group(0) @binding(1) var<storage, read> instances: array<Instance>;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @builtin(instance_index) instanceIdx: u32,
};

// 由 down 向量到实例 axis 的旋转（无翻转的最短弧）。
fn rotationTo(axis: vec3<f32>) -> mat4x4<f32> {
  let down = vec3<f32>(0.0, -1.0, 0.0);
  let v = cross(down, axis);
  let s = length(v);
  let c = dot(down, axis);
  if (s < 0.0001) {
    return mat4x4<f32>(
      vec4<f32>(1.0, 0.0, 0.0, 0.0),
      vec4<f32>(0.0, c, 0.0, 0.0),
      vec4<f32>(0.0, 0.0, 1.0, 0.0),
      vec4<f32>(0.0, 0.0, 0.0, 1.0));
  }
  let k = (1.0 - c) / (s * s);
  let x = v.x, y = v.y, z = v.z;
  return mat4x4<f32>(
    vec4<f32>(1.0 + k * (x*x - s*s), k * x * y + z, k * x * z - y, 0.0),
    vec4<f32>(k * x * y - z, 1.0 + k * (y*y - s*s), k * y * z + x, 0.0),
    vec4<f32>(k * x * z + y, k * y * z - x, 1.0 + k * (z*z - s*s), 0.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0));
}

@vertex
fn vsMain(@location(0) position: vec3<f32>,
          @location(1) normal: vec3<f32>,
          @builtin(instance_index) ii: u32) -> VSOut {
  let ins = instances[ii];
  let rot = rotationTo(normalize(ins.axisRadius.xyz));
  // 原型：根在原点、单位高度向下；先缩放再旋转再平移
  let scaled = vec4<f32>(
    position.x * ins.axisRadius.w,
    position.y * ins.root.w,
    position.z * ins.axisRadius.w, 1.0);
  let world = rot * scaled + vec4<f32>(ins.root.xyz, 0.0);
  var out: VSOut;
  out.worldPos = world.xyz;
  out.normal = (rot * vec4<f32>(normal, 0.0)).xyz;
  out.clip = globals.camera.viewProj * world;
  out.color = ins.colorSeed.rgb;
  out.instanceIdx = ii;
  return out;
}
`,
  fragment: /* wgsl */ `
${COMMON_WGSL}
@fragment
fn fsMain(@location(0) worldPos: vec3<f32>,
          @location(1) normal: vec3<f32>,
          @location(2) color: vec3<f32>) -> @location(0) vec4<f32> {
  applyClip(worldPos);
  return shade(color, worldPos, normal);
}
`,
};
