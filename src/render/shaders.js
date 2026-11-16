export const WGSL_COMMON = /* wgsl */ `
const PI: f32 = 3.14159265359;

fn srgbEncode(c: vec3f) -> vec3f {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3f(0.0031308));
}

fn acesFilm(x: vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn linearDepth(d: f32, near: f32, far: f32) -> f32 {
  // perspective depth 0..1 -> view-space distance (positive)
  return near * far / (far - d * (far - near));
}
`

export const WGSL_SHADOW = /* wgsl */ `
struct ShadowCam {
  lightViewProj: mat4x4f,
}
@group(0) @binding(0) var<uniform> sc: ShadowCam;

struct VSIn {
  @location(0) pos: vec3f,
  @location(2) col: vec4f,
}

@vertex
fn vs(@location(0) pos: vec3f) -> @builtin(position) vec4f {
  return sc.lightViewProj * vec4f(pos, 1.0);
}
`

export const WGSL_FORWARD = /* wgsl */ `
${''}
struct Cam {
  viewProj: mat4x4f,
  lightViewProj: mat4x4f,
  eye: vec4f,
  sunDir: vec4f,      // xyz dir, w intensity
  params: vec4f,      // near, far, time, worldScale
  tint: vec4f,
}

@group(0) @binding(0) var<uniform> cam: Cam;
@group(0) @binding(1) var shadowTex: texture_depth_2d;
@group(0) @binding(2) var shadowSamp: sampler_comparison;

struct VSIn {
  @location(0) pos: vec3f,
  @location(1) nrm: vec3f,
  @location(2) col: vec4f,
}

struct VSOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) nrm: vec3f,
  @location(2) col: vec4f,
  @location(3) lightPos: vec4f,
}

@vertex
fn vs(v: VSIn) -> VSOut {
  var o: VSOut;
  o.clip = cam.viewProj * vec4f(v.pos, 1.0);
  o.world = v.pos;
  o.nrm = v.nrm;
  o.col = v.col;
  o.lightPos = cam.lightViewProj * vec4f(v.pos, 1.0);
  return o;
}

struct FSOut {
  @location(0) color: vec4f,
  @location(1) nrm: vec4f,
}

fn shadowAt(lp: vec4f, n: vec3f) -> f32 {
  let ndc = lp.xyz / lp.w;
  let uv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 1.0; }
  let bias = 0.0015 + 0.004 * (1.0 - abs(dot(n, cam.sunDir.xyz)));
  let texel = 1.0 / 2048.0;
  var sum = 0.0;
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let o = vec2f(f32(x), f32(y)) * texel;
      sum = sum + textureSampleCompareLevel(shadowTex, shadowSamp, uv + o, ndc.z - bias);
    }
  }
  return sum / 9.0;
}

@fragment
fn fs(v: VSOut) -> FSOut {
  var out: FSOut;
  let n = normalize(v.nrm);
  let sun = normalize(cam.sunDir.xyz);
  let viewDir = normalize(cam.eye.xyz - v.world);
  let V = viewDir;
  let L = sun;
  let NdotL = max(dot(n, L), 0.0);
  let shRaw = shadowAt(v.lightPos, n);
  let sh = shRaw * step(0.001, NdotL);

  // 材质参数从颜色亮度近似：亮金属更镜面一些
  let base = v.col.rgb;
  let lum = dot(base, vec3f(0.2126, 0.7152, 0.0722));
  let rough = clamp(0.42 + lum * 0.2, 0.2, 0.9);
  let metal = clamp(0.15 + lum * 0.25, 0.0, 0.6);

  let H = normalize(L + V);
  let specPower = mix(160.0, 12.0, rough);
  let spec = pow(max(dot(n, H), 0.0), specPower) * (0.2 + metal * 0.5);

  // 半球环境光（天光 + 地面反射）
  let skyCol = vec3f(0.30, 0.38, 0.52) * 0.30;
  let grdCol = vec3f(0.16, 0.14, 0.13) * 0.22;
  let hemi = mix(grdCol, skyCol, n.y * 0.5 + 0.5) * 1.0;
  let fill = max(dot(n, normalize(vec3f(0.5, 0.35, 0.8))), 0.0) * vec3f(0.08, 0.10, 0.13);

  let rim = pow(1.0 - max(dot(n, V), 0.0), 3.5) * 0.10;

  var col = base * (hemi + fill + vec3f(1.0, 0.955, 0.9) * NdotL * sh * 1.12);
  col = col + vec3f(1.0, 0.97, 0.92) * spec * sh * 0.32;
  col = col + vec3f(0.5, 0.62, 0.8) * rim;

  // 正视/背视时法线轻微提亮，帮助读结构
  col = col * cam.tint.rgb;

  out.color = vec4f(col, v.col.a);
  out.nrm = vec4f(n * 0.5 + 0.5, 1.0);
  return out;
}
`

export const WGSL_SSAO = /* wgsl */ `
struct AoCam {
  invViewProj: mat4x4f,
  viewProj: mat4x4f,
  params: vec4f,  // radius, intensity, near, far
  screen: vec4f,  // width, height, 1/w, 1/h
}
@group(0) @binding(0) var<uniform> ac: AoCam;
@group(0) @binding(1) var depthTex: texture_depth_2d;
@group(0) @binding(2) var nrmTex: texture_2d<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

fn worldFromDepth(uv: vec2f) -> vec3f {
  let dims = vec2i(ac.screen.xy);
  let d = textureLoad(depthTex, vec2i(uv * ac.screen.xy), 0);
  if (d >= 0.99999) { return vec3f(1e6); }
  let clip = vec4f(uv.x * 2.0 - 1.0, (1.0 - uv.y) * 2.0 - 1.0, d, 1.0);
  let w = ac.invViewProj * clip;
  return w.xyz / w.w;
}

fn hash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 = p3 + dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let uv = frag.xy * ac.screen.zw;
  let d = textureLoad(depthTex, vec2i(frag.xy), 0);
  if (d >= 0.99999) { return vec4f(1.0); }
  let n = normalize(textureLoad(nrmTex, vec2i(frag.xy), 0).xyz * 2.0 - 1.0);
  let P = worldFromDepth(uv);
  let radius = ac.params.x;
  let seed = hash12(frag.xy);
  var occ = 0.0;
  let rot = seed * 6.2831853;
  for (var i = 0; i < 12; i++) {
    let fi = f32(i);
    let ang = rot + fi * 2.3999632;
    let r = radius * sqrt((fi + 0.5) / 12.0);
    // 半球方向：切向 + 法线偏移
    let t1 = normalize(cross(n, vec3f(0.31, 0.76, 0.57)));
    let t2 = cross(n, t1);
    let dir = t1 * cos(ang) + t2 * sin(ang) + n * (0.4 + 0.6 * hash12(frag.xy + fi));
    let S = P + normalize(dir) * r;
    let clip = ac.viewProj * vec4f(S, 1.0);
    let ndc = clip.xyz / clip.w;
    let suv = vec2f(ndc.x * 0.5 + 0.5, 0.5 - ndc.y * 0.5);
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) { continue; }
    let sd = textureLoad(depthTex, vec2i(suv * ac.screen.xy), 0);
    let sampleZ = ndc.z;
    let diff = sd - sampleZ;
    let rangeOk = step(0.0, sd - sampleZ) * step(sd, 1.0);
    let dist = length(S - P);
    let atten = 1.0 / (1.0 + dist * dist * 4.0);
    if (sd < 1.0 && sd > sampleZ + 0.00025) {
      occ = occ + atten * clamp(diff * 40.0, 0.0, 1.0);
    }
  }
  let ao = clamp(1.0 - occ * ac.params.y, 0.0, 1.0);
  return vec4f(ao, ao, ao, 1.0);
}
`

export const WGSL_COMPOSITE = /* wgsl */ `
struct Post {
  invViewProj: mat4x4f,
  params: vec4f,  // near, far, exposure, time
  screen: vec4f,  // width, height, 1/w, 1/h
  bg: vec4f,
}
@group(0) @binding(0) var<uniform> pc: Post;
@group(0) @binding(1) var colorTex: texture_2d<f32>;
@group(0) @binding(2) var depthTex: texture_depth_2d;
@group(0) @binding(3) var aoTex: texture_2d<f32>;
@group(0) @binding(4) var linSamp: sampler;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

fn acesFilm(x: vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn linearDepth(d: f32, near: f32, far: f32) -> f32 {
  return near * far / (far - d * (far - near));
}

fn srgbToLinearBg(c: vec3f) -> vec3f {
  let lo = c / 12.92;
  let hi = pow(max(c, vec3f(0.0)), vec3f(2.2));
  return select(hi, lo, c <= vec3f(0.04045));
}

fn srgbEncode(c: vec3f) -> vec3f {
  let lo = c * 12.92;
  let hi = 1.055 * pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.4)) - 0.055;
  return select(hi, lo, c <= vec3f(0.0031308));
}

@fragment
fn fs(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let pix = vec2i(frag.xy);
  let uv = frag.xy * pc.screen.zw;
  let d = textureLoad(depthTex, pix, 0);
  var cx = frag.xy - pc.screen.xy * 0.5;
  let vig = 1.0 - dot(cx, cx) / (pc.screen.x * pc.screen.y * 0.85);

  if (d >= 0.99999) {
    // 背景：背景色已按显示空间给定，直接输出，避免被 filmic 提亮
    let t = uv.y;
    var bg = mix(pc.bg.rgb * 1.55, pc.bg.rgb * 0.7, pow(clamp(t, 0.0, 1.0), 0.85));
    bg = bg * (0.86 + vig * 0.22);
    return vec4f(bg, 1.0);
  }

  let c = textureLoad(colorTex, pix, 0);
  let aoV = textureSampleLevel(aoTex, linSamp, uv, 0.0).r;
  let ao = mix(1.0, aoV, 0.85);
  var col = c.rgb;
  // 环境光遮蔽只压环境部分，保留直射亮部
  col = col * mix(vec3f(ao), vec3f(1.0), 0.22);

  let lin = linearDepth(d, pc.params.x, pc.params.y);
  col = col * pc.params.z;
  // 远处空气透视：把地面推向背景色，避免出现生硬的地平线
  let fog = clamp((lin - 12.0) / 70.0, 0.0, 1.0);
  let bgFog = srgbToLinearBg(pc.bg.rgb * 0.75);
  col = mix(col, bgFog, fog * 0.85);
  col = acesFilm(col * 1.05);
  col = col * (0.92 + vig * 0.16);
  var rgb = srgbEncode(col);
  return vec4f(rgb, 1.0);
}
`

export const WGSL_OVERLAY = /* wgsl */ `
struct OCam {
  viewProj: mat4x4f,
  screen: vec4f, // width, height, 1/w, 1/h
  params: vec4f, // fadeStart, fadeEnd, xrayAlpha, time
}
@group(0) @binding(0) var<uniform> oc: OCam;
@group(0) @binding(1) var depthTex: texture_depth_2d;

struct LineIn {
  @builtin(vertex_index) vi: u32,
  @location(0) a: vec3f,
  @location(1) b: vec3f,
  @location(2) color: vec4f,
  @location(3) style: vec4f,   // width(px), dash(0=none,>0 len), -, -
}

struct LineOut {
  @builtin(position) clip: vec4f,
  @location(0) color: vec4f,
  @location(1) edge: f32,
  @location(2) @interpolate(linear) depthNdc: f32,
  @location(3) @interpolate(flat) style: vec4f,
}

const CORNERS = array<vec2f, 4>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));

@vertex
fn vs(v: LineIn) -> LineOut {
  var o: LineOut;
  let pa = oc.viewProj * vec4f(v.a, 1.0);
  let pb = oc.viewProj * vec4f(v.b, 1.0);
  let res = oc.screen.xy;
  let ha = pa.xy / pa.w * res * 0.5;
  let hb = pb.xy / pb.w * res * 0.5;
  var dir = hb - ha;
  let dl = length(dir);
  if (dl < 0.00001) { dir = vec2f(1.0, 0.0); } else { dir = dir / dl; }
  let nrm = vec2f(-dir.y, dir.x);
  let corner = CORNERS[v.vi];
  let width = v.style.x;
  let side = corner.x * (width * 0.5 + 0.5);
  let end = select(pa, pb, corner.y > 0.0);
  var px = vec2f(nrm * side);
  // 虚线：沿线方向按 dash 周期切掉（按顶点整体丢弃半个周期）
  if (v.style.z > 0.0) {
    let d = fract(dl / (v.style.z * 6.0));
    if (d > 0.6) { px = px * 0.0; }
  }
  o.clip = vec4f(end.xy + px / (res * 0.5) * end.w, end.z, end.w);
  o.edge = corner.x;
  o.color = v.color;
  o.style = v.style;
  let za = pa.z / max(pa.w, 0.0001);
  let zb = pb.z / max(pb.w, 0.0001);
  o.depthNdc = select(za, zb, corner.y > 0.0);
  return o;
}

@fragment
fn fs(v: LineOut) -> @location(0) vec4f {
  var col = v.color;
  let frag = v.clip.xy;
  let uv = frag * oc.screen.zw;
  let sd = textureLoad(depthTex, vec2i(frag), 0);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { discard; }
  let myZ = v.depthNdc;
  let behind = step(sd + 0.00012, myZ);
  // 被遮挡线：逐线标记 xray，被挡时降透明；未标记则直接丢弃
  if (behind > 0.5) {
    if (v.style.y < 0.5) { discard; }
    col = vec4f(mix(col.rgb, vec3f(0.55, 0.62, 0.72), 0.45), col.a * 0.34);
  }
  // 边缘柔化
  let aa = 1.0 - smoothstep(0.55, 1.0, abs(v.edge));
  col = vec4f(col.rgb, col.a * mix(0.35, 1.0, aa));
  return col;
}
`
