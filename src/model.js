// 展位几何、灯具模型与照度计算(JS 侧,与着色器保持一致)

export const MAX_LIGHTS = 12;
export const BOOTH = { W: 6, D: 4, H: 2.5, trussY: 2.6 };

const PLATFORM = { x0: 1.0, x1: 3.0, z0: 1.4, z1: 2.8, h: 0.15 };
const COLUMN = { cx: 4.4, cz: 1.8, r: 0.175, h: 2.5 };

function quad(corners, normal, albedo) {
  return { corners, normal, albedo };
}

// 本体: 地面、墙体、展台、顶架、立柱
export const SURFACES = [
  // 地面
  quad([[0, 0, 0], [BOOTH.W, 0, 0], [BOOTH.W, 0, BOOTH.D], [0, 0, BOOTH.D]], [0, 1, 0], [0.8, 0.78, 0.74]),
  // 后墙 (z=0)
  quad([[0, 0, 0], [BOOTH.W, 0, 0], [BOOTH.W, BOOTH.H, 0], [0, BOOTH.H, 0]], [0, 0, 1], [0.88, 0.86, 0.82]),
  // 左墙 (x=0)
  quad([[0, 0, 0], [0, 0, BOOTH.D], [0, BOOTH.H, BOOTH.D], [0, BOOTH.H, 0]], [1, 0, 0], [0.85, 0.83, 0.79]),
  // 展台台面
  quad(
    [[PLATFORM.x0, PLATFORM.h, PLATFORM.z0], [PLATFORM.x1, PLATFORM.h, PLATFORM.z0], [PLATFORM.x1, PLATFORM.h, PLATFORM.z1], [PLATFORM.x0, PLATFORM.h, PLATFORM.z1]],
    [0, 1, 0], [0.72, 0.7, 0.66]
  ),
  // 展台立面
  quad([[PLATFORM.x0, 0, PLATFORM.z1], [PLATFORM.x1, 0, PLATFORM.z1], [PLATFORM.x1, PLATFORM.h, PLATFORM.z1], [PLATFORM.x0, PLATFORM.h, PLATFORM.z1]], [0, 0, 1], [0.6, 0.58, 0.55]),
  quad([[PLATFORM.x1, 0, PLATFORM.z0], [PLATFORM.x1, 0, PLATFORM.z1], [PLATFORM.x1, PLATFORM.h, PLATFORM.z1], [PLATFORM.x1, PLATFORM.h, PLATFORM.z0]], [-1, 0, 0], [0.6, 0.58, 0.55]),
  quad([[PLATFORM.x0, 0, PLATFORM.z0], [PLATFORM.x1, 0, PLATFORM.z0], [PLATFORM.x1, PLATFORM.h, PLATFORM.z0], [PLATFORM.x0, PLATFORM.h, PLATFORM.z0]], [0, 0, -1], [0.6, 0.58, 0.55]),
  quad([[PLATFORM.x0, 0, PLATFORM.z0], [PLATFORM.x0, 0, PLATFORM.z1], [PLATFORM.x0, PLATFORM.h, PLATFORM.z1], [PLATFORM.x0, PLATFORM.h, PLATFORM.z0]], [1, 0, 0], [0.6, 0.58, 0.55]),
  // 立柱四面
  ...[[-1, 0], [0, -1], [1, 0], [0, 1]].map(([nx, nz]) => {
    const { cx, cz, r, h } = COLUMN;
    const p = [
      [cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r], [cx - r, cz + r],
    ];
    // 按法线方向取该面的两个角点
    const face = p.filter(([x, z]) => (nx !== 0 ? Math.abs(x - (cx + nx * r)) < 1e-6 : Math.abs(z - (cz + nz * r)) < 1e-6));
    return quad(
      [[face[0][0], 0, face[0][1]], [face[1][0], 0, face[1][1]], [face[1][0], h, face[1][1]], [face[0][0], h, face[0][1]]],
      [nx, 0, nz], [0.78, 0.76, 0.72]
    );
  }),
  // 顶架(横梁底面, y=2.6)
  quad([[0.35, BOOTH.trussY, 0.35], [5.65, BOOTH.trussY, 0.35], [5.65, BOOTH.trussY, 0.53], [0.35, BOOTH.trussY, 0.53]], [0, -1, 0], [0.3, 0.3, 0.32]),
  quad([[0.35, BOOTH.trussY, 3.47], [5.65, BOOTH.trussY, 3.47], [5.65, BOOTH.trussY, 3.65], [0.35, BOOTH.trussY, 3.65]], [0, -1, 0], [0.3, 0.3, 0.32]),
  quad([[0.35, BOOTH.trussY, 0.35], [0.53, BOOTH.trussY, 0.35], [0.53, BOOTH.trussY, 3.65], [0.35, BOOTH.trussY, 3.65]], [0, -1, 0], [0.3, 0.3, 0.32]),
  quad([[5.47, BOOTH.trussY, 0.35], [5.65, BOOTH.trussY, 0.35], [5.65, BOOTH.trussY, 3.65], [5.47, BOOTH.trussY, 3.65]], [0, -1, 0], [0.3, 0.3, 0.32]),
];

// 遮挡体: 垂直立面在 XZ 平面的线段 + 高度(墙体、立柱、展台沿)
export const OCCLUDERS = [
  { a: [0, 0], b: [BOOTH.W, 0], h: BOOTH.H },
  { a: [0, 0], b: [0, BOOTH.D], h: BOOTH.H },
  { a: [COLUMN.cx - COLUMN.r, COLUMN.cz - COLUMN.r], b: [COLUMN.cx + COLUMN.r, COLUMN.cz - COLUMN.r], h: COLUMN.h },
  { a: [COLUMN.cx + COLUMN.r, COLUMN.cz - COLUMN.r], b: [COLUMN.cx + COLUMN.r, COLUMN.cz + COLUMN.r], h: COLUMN.h },
  { a: [COLUMN.cx + COLUMN.r, COLUMN.cz + COLUMN.r], b: [COLUMN.cx - COLUMN.r, COLUMN.cz + COLUMN.r], h: COLUMN.h },
  { a: [COLUMN.cx - COLUMN.r, COLUMN.cz + COLUMN.r], b: [COLUMN.cx - COLUMN.r, COLUMN.cz - COLUMN.r], h: COLUMN.h },
  { a: [PLATFORM.x0, PLATFORM.z0], b: [PLATFORM.x1, PLATFORM.z0], h: PLATFORM.h },
  { a: [PLATFORM.x1, PLATFORM.z0], b: [PLATFORM.x1, PLATFORM.z1], h: PLATFORM.h },
  { a: [PLATFORM.x1, PLATFORM.z1], b: [PLATFORM.x0, PLATFORM.z1], h: PLATFORM.h },
  { a: [PLATFORM.x0, PLATFORM.z1], b: [PLATFORM.x0, PLATFORM.z0], h: PLATFORM.h },
];
export const MAX_OCC = OCCLUDERS.length;

export const LIGHT_TYPES = {
  spot: { label: '射灯', angle: 30, intensity: 0.9, temp: 3000, h: 2.6 },
  wash: { label: '洗墙灯', angle: 55, intensity: 0.8, temp: 4000, h: 2.6 },
  strip: { label: '灯带', angle: 120, intensity: 0.5, temp: 3000, h: 2.4 },
};

export const AMBIENTS = {
  day: { label: '白天', lux: 320, color: [0.92, 0.97, 1.08], bg: 0x9fb4c4 },
  night: { label: '夜间', lux: 18, color: [1.0, 0.9, 0.72], bg: 0x0b0e14 },
};

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// 色温(K) -> RGB (Tanner Helland 近似)
export function kelvinToRGB(kelvin) {
  const t = kelvin / 100;
  let r, g, b;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  const c = (v) => Math.min(255, Math.max(0, v)) / 255;
  return [c(r), c(g), c(b)];
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;

// 2D 射线 o+t*d 与线段 ab 求交, 返回 t 或 -1
function raySeg(ox, oz, dx, dz, a, b) {
  const ex = b[0] - a[0], ez = b[1] - a[1];
  const den = cross2(dx, dz, ex, ez);
  if (Math.abs(den) < 1e-9) return -1;
  const t = cross2(a[0] - ox, a[1] - oz, ex, ez) / den;
  const s = cross2(a[0] - ox, a[1] - oz, dx, dz) / den;
  if (t > 0.02 && t < 0.999 && s >= 0 && s <= 1) return t;
  return -1;
}

function visFrom(P, L) {
  const dx = L[0] - P[0], dy = L[1] - P[1], dz = L[2] - P[2];
  for (const o of OCCLUDERS) {
    const t = raySeg(P[0], P[2], dx, dz, o.a, o.b);
    if (t > 0) {
      const y = P[1] + t * dy;
      if (y < o.h) return 0;
    }
  }
  return 1;
}

// 软阴影: 把灯当作半径 0.12m 的面光源采样 5 次, 遮挡比例即半影
export function visibilityAt(P, L, shadows) {
  if (!shadows) return 1;
  const d = [L[0] - P[0], L[1] - P[1], L[2] - P[2]];
  const len = Math.hypot(...d);
  const dir = d.map((v) => v / len);
  const up = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  let u = [
    dir[1] * up[2] - dir[2] * up[1],
    dir[2] * up[0] - dir[0] * up[2],
    dir[0] * up[1] - dir[1] * up[0],
  ];
  const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const v = [
    dir[1] * u[2] - dir[2] * u[1],
    dir[2] * u[0] - dir[0] * u[2],
    dir[0] * u[1] - dir[1] * u[0],
  ];
  const r = 0.12;
  let s = visFrom(P, L);
  s += visFrom(P, [L[0] + u[0] * r, L[1] + u[1] * r, L[2] + u[2] * r]);
  s += visFrom(P, [L[0] - u[0] * r, L[1] - u[1] * r, L[2] - u[2] * r]);
  s += visFrom(P, [L[0] + v[0] * r, L[1] + v[1] * r, L[2] + v[2] * r]);
  s += visFrom(P, [L[0] - v[0] * r, L[1] - v[1] * r, L[2] - v[2] * r]);
  return s / 5;
}

// 点 P(法线 N) 处所有灯叠加的辐照度 RGB (单位≈勒克斯)
export function irradianceAt(P, N, lights, shadows) {
  let r = 0, g = 0, b = 0;
  for (const L of lights) {
    if (!L.on) continue;
    const Lp = [L.x, L.h, L.z];
    const d = [Lp[0] - P[0], Lp[1] - P[1], Lp[2] - P[2]];
    const dist = Math.hypot(...d);
    const dirL = d.map((v) => v / dist);
    const aim = [L.aimX - L.x, -L.h, L.aimZ - L.z];
    const al = Math.hypot(...aim);
    const aimD = aim.map((v) => v / al);
    const cosA = -(dirL[0] * aimD[0] + dirL[1] * aimD[1] + dirL[2] * aimD[2]);
    const half = ((L.angle / 2) * Math.PI) / 180;
    const cone = smoothstep(Math.cos(half), Math.cos(half * 0.8), cosA);
    if (cone <= 0) continue;
    const att = (L.intensity * 4500) / (dist * dist + 0.05);
    const lam = Math.max(0, N[0] * dirL[0] + N[1] * dirL[1] + N[2] * dirL[2]);
    if (lam <= 0) continue;
    const vis = visibilityAt(P, Lp, shadows);
    if (vis <= 0) continue;
    const col = kelvinToRGB(L.temp);
    const k = att * cone * lam * vis;
    r += col[0] * k; g += col[1] * k; b += col[2] * k;
  }
  return [r, g, b];
}

const lum = (rgb) => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;

// 区域照度统计: 地面划分为 6x4 个 1m 区域, 每区 4x4 采样
export function computeZoneStats(lights, ambient, shadows, threshold) {
  const amb = ambient.color.map((c) => c * ambient.lux);
  const ambLux = lum(amb);
  const zones = [];
  for (let zi = 0; zi < BOOTH.D; zi++) {
    for (let xi = 0; xi < BOOTH.W; xi++) {
      const samples = [];
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const P = [xi + (sx + 0.5) / 4, 0, zi + (sy + 0.5) / 4];
          const irr = irradianceAt(P, [0, 1, 0], lights, shadows);
          samples.push(lum(irr) + ambLux);
        }
      }
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const min = Math.min(...samples);
      zones.push({
        id: `${String.fromCharCode(65 + xi)}${zi + 1}`,
        xi, zi,
        avg, min,
        uniformity: avg > 0 ? min / avg : 0,
        dark: avg < threshold,
      });
    }
  }
  const avgs = zones.map((z) => z.avg);
  const overall = {
    avg: avgs.reduce((a, b) => a + b, 0) / avgs.length,
    min: Math.min(...avgs),
    max: Math.max(...avgs),
  };
  overall.uniformity = overall.avg > 0 ? overall.min / overall.avg : 0;
  return { zones, overall, darkCount: zones.filter((z) => z.dark).length };
}

// ---------- 项目 / 工作流 ----------

export const STATUS = {
  making: { label: '制作中', color: '#4f8ef7' },
  review: { label: '待审核', color: '#e6a23c' },
  rejected: { label: '已退回', color: '#e05555' },
  done: { label: '已交付', color: '#3fae6a' },
};

export const ROLES = {
  client: '客户',
  maker: '制作员',
  supervisor: '主管',
};

export function makeLight(type, x, z, name) {
  const p = LIGHT_TYPES[type];
  return {
    id: uid(),
    name: name || `${p.label}`,
    type,
    x, z,
    h: p.h,
    aimX: x, aimZ: z,
    temp: p.temp,
    intensity: p.intensity,
    angle: p.angle,
    on: true,
  };
}

export const CAM_PRESETS = {
  '主视角': { yaw: 0.45, pitch: 0.55, dist: 9 },
  '俯视': { yaw: 0.15, pitch: 1.25, dist: 10 },
  '右侧视角': { yaw: 1.25, pitch: 0.5, dist: 9 },
};

export function makeShot(name) {
  const cam = { ...(CAM_PRESETS[name] || CAM_PRESETS['主视角']), target: [3, 0.8, 2] };
  return {
    id: uid(),
    name,
    cam,
    schemes: {
      A: {
        lights: [
          { ...makeLight('spot', 1.5, 0.6, '射灯1'), aimX: 1.8, aimZ: 1.9 },
          { ...makeLight('spot', 4.6, 0.6, '射灯2'), aimX: 4.4, aimZ: 1.8 },
          { ...makeLight('wash', 3.0, 0.5, '洗墙灯1'), aimX: 3.0, aimZ: 0.05 },
          { ...makeLight('strip', 0.3, 2.2, '灯带1'), aimX: 1.6, aimZ: 2.2 },
        ],
      },
      B: null,
    },
    activeScheme: 'A',
  };
}

export function makeProject(name, client, deadline) {
  return {
    id: uid(),
    name,
    client,
    deadline,
    status: 'making',
    rework: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    shots: [makeShot('主视角'), makeShot('俯视')],
  };
}

export function seedProjects() {
  const p = makeProject('新能源汽车展台', '客户A', datePlus(7));
  return [p];
}

export function datePlus(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

export function daysLeft(deadline) {
  return Math.ceil((new Date(deadline + 'T23:59:59') - Date.now()) / 86400000);
}
