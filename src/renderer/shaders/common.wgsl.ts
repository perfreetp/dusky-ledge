// 共享 WGSL：相机/光照/剖切 uniform 与通用函数。
// 各管线 shader 通过 #include 风格的字符串拼接引入本文件内容。

export const COMMON_WGSL = /* wgsl */ `
struct Camera {
  viewProj: mat4x4<f32>,
  eye: vec3<f32>,
  _pad0: f32,
};

struct Light {
  position: vec3<f32>,
  intensity: f32,
  color: vec3<f32>,
  _pad: f32,
};

struct Globals {
  camera: Camera,
  clipEnabled: f32,
  _gpad0: f32,
  _gpad1: f32,
  _gpad2: f32,
  clipPoint: vec3<f32>,
  _gpad3: f32,
  clipNormal: vec3<f32>,
  lightCount: f32,
  lights: array<Light, 8>,
};

@group(0) @binding(0) var<uniform> globals: Globals;

fn applyClip(worldPos: vec3<f32>) {
  if (globals.clipEnabled > 0.5) {
    let d = dot(worldPos - globals.clipPoint, globals.clipNormal);
    if (d < 0.0) { discard; }
  }
}

// 简单 Blinn-Phong：环境 + 至多 8 个点光，距离衰减。
fn shade(baseColor: vec3<f32>, worldPos: vec3<f32>, normal: vec3<f32>): vec4<f32> {
  var n = normalize(normal);
  var color = baseColor * vec3<f32>(0.28);
  let count = min(i32(globals.lightCount), 8);
  for (var i = 0; i < count; i++) {
    let L = globals.lights[i].position - worldPos;
    let dist = length(L);
    let atten = globals.lights[i].intensity / (1.0 + 0.18 * dist + 0.06 * dist * dist);
    let ndl = max(dot(n, normalize(L)), 0.0);
    color += baseColor * globals.lights[i].color * ndl * atten;
  }
  // 微弱顶光，避免无灯区死黑
  color += baseColor * vec3<f32>(0.10, 0.11, 0.13);
  return vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
}
`;
