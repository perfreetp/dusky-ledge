// WGSL 着色器：巷道体块/设施统一管线，支持视锥外裁剪（CPU 侧）、剖切面、高亮脉冲、距离雾
export const SCENE_WGSL = /* wgsl */ `
struct Uniforms {
  viewProj: mat4x4<f32>,
  eye: vec3<f32>,
  clipEnabled: u32,
  clipPlane: vec4<f32>, // xyz + d，保留 dot(n, p) + d > 0 的片元
  fogColor: vec3<f32>,
  pad: f32,
};

@group(0) @binding(0) var<uniform> U: Uniforms;
struct RwStyle { color: vec4<f32> }; // w=0 使用顶点色；w=1 高亮 rgb
@group(0) @binding(1) var<storage, read> styles: array<RwStyle>;

struct VSIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) rwId: u32,
};

struct VSOut {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) rwId: u32,
  @location(4) eyeDist: f32,
};

@vertex
fn vs_main(in: VSIn) -> VSOut {
  var out: VSOut;
  let wp = vec4<f32>(in.position, 1.0);
  out.clipPos = U.viewProj * wp;
  out.worldPos = in.position;
  out.normal = in.normal;
  out.color = in.color;
  out.rwId = in.rwId;
  out.eyeDist = distance(U.eye, in.position);
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  if (U.clipEnabled == 1u) {
    if (dot(U.clipPlane.xyz, in.worldPos) + U.clipPlane.w <= 0.0) {
      discard;
    }
  }

  let style: RwStyle = styles[in.rwId].color;
  var base: vec3<f32> = in.color;
  var emissive: f32 = 0.0;
  if (style.w > 1.5) {
    // 差异着色（新增/废弃）：稳态混色，不脉冲
    base = mix(in.color, style.rgb, 0.8);
  } else if (style.w > 0.5) {
    // 选中高亮：混色 + 呼吸脉冲（时间通过 uniform pad 传入）
    base = mix(in.color, style.rgb, 0.75);
    emissive = 0.3 + 0.18 * sin(U.pad * 4.0);
  }

  let n = normalize(in.normal);
  let keyDir = normalize(vec3<f32>(-0.45, -0.55, 0.75));
  let lambert = max(dot(n, keyDir), 0.0);
  let viewWrap = max(dot(n, normalize(U.eye - in.worldPos)), 0.0);
  var lit: vec3<f32> = base * (0.32 + 0.68 * lambert) + base * 0.25 * viewWrap + vec3<f32>(emissive);

  // 距离雾：12 万米场景深度提示
  let fog = clamp((in.eyeDist - 900.0) / 4200.0, 0.0, 0.82);
  lit = mix(lit, U.fogColor, fog);
  return vec4<f32>(lit, 1.0);
}
`;

export const LINE_WGSL = /* wgsl */ `
struct Uniforms {
  viewProj: mat4x4<f32>,
  eye: vec3<f32>,
  clipEnabled: u32,
  clipPlane: vec4<f32>,
  fogColor: vec3<f32>,
  pad: f32,
};
@group(0) @binding(0) var<uniform> U: Uniforms;
struct RwStyle { color: vec4<f32> };
@group(0) @binding(1) var<storage, read> styles: array<RwStyle>;

struct VSIn {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) color: vec3<f32>,
  @location(3) rwId: u32,
};
struct VSOut {
  @builtin(position) clipPos: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) color: vec3<f32>,
  @location(2) rwId: u32,
  @location(3) eyeDist: f32,
};
@vertex
fn vs_line(in: VSIn) -> VSOut {
  var out: VSOut;
  out.clipPos = U.viewProj * vec4<f32>(in.position, 1.0);
  out.worldPos = in.position;
  let style = styles[in.rwId].color;
  out.color = select(in.color, mix(in.color, style.rgb, 0.8), style.w > 0.5);
  out.rwId = in.rwId;
  out.eyeDist = distance(U.eye, in.position);
  return out;
}
@fragment
fn fs_line(in: VSOut) -> @location(0) vec4<f32> {
  if (U.clipEnabled == 1u) {
    if (dot(U.clipPlane.xyz, in.worldPos) + U.clipPlane.w <= 0.0) {
      discard;
    }
  }
  let fog = clamp((in.eyeDist - 900.0) / 4200.0, 0.0, 0.82);
  return vec4<f32>(mix(in.color, U.fogColor, fog), 1.0);
}
`;
