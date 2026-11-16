// 程序化几何体生成 + 简易 OBJ 导入
import { V3 } from './math.js';

function mergeMeshes(parts) {
  const positions = [], normals = [], indices = [];
  let base = 0;
  for (const m of parts) {
    for (const p of m.positions) positions.push(p);
    for (const n of m.normals) normals.push(n);
    for (const i of m.indices) indices.push(i + base);
    base += m.positions.length / 3;
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function transformMesh(m, fn) {
  const positions = new Float32Array(m.positions.length);
  const normals = new Float32Array(m.normals.length);
  for (let i = 0; i < m.positions.length; i += 3) {
    const p = fn([m.positions[i], m.positions[i + 1], m.positions[i + 2]]);
    positions[i] = p[0]; positions[i + 1] = p[1]; positions[i + 2] = p[2];
    normals[i] = m.normals[i]; normals[i + 1] = m.normals[i + 1]; normals[i + 2] = m.normals[i + 2];
  }
  return { positions, normals, indices: m.indices };
}

export function makeSphere(r = 1, seg = 16, rings = 12, scale = [1, 1, 1]) {
  const positions = [], normals = [], indices = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, phi = v * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, theta = u * Math.PI * 2;
      const n = [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ];
      positions.push(n[0] * r * scale[0], n[1] * r * scale[1], n[2] * r * scale[2]);
      normals.push(...V3.norm([n[0] / scale[0], n[1] / scale[1], n[2] / scale[2]]));
    }
  }
  for (let y = 0; y < rings; y++)
    for (let x = 0; x < seg; x++) {
      const a = y * (seg + 1) + x, b = a + seg + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function makeBox(sx = 1, sy = 1, sz = 1) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const faces = [
    [[1, 0, 0], [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z]]],
    [[-1, 0, 0], [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z]]],
    [[0, 1, 0], [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z]]],
    [[0, -1, 0], [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z]]],
    [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
    [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
  ];
  const positions = [], normals = [], indices = [];
  let base = 0;
  for (const [n, verts] of faces) {
    for (const v of verts) { positions.push(...v); normals.push(...n); }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function makeCylinder(rTop = 0.5, rBot = 0.5, h = 1, seg = 16) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    positions.push(c * rBot, -h / 2, s * rBot, c * rTop, h / 2, s * rTop);
    normals.push(c, 0, s, c, 0, s);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

export function makeTorus(R = 1, r = 0.05, segT = 48, segP = 10) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= segT; i++) {
    const u = (i / segT) * Math.PI * 2;
    const cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= segP; j++) {
      const v = (j / segP) * Math.PI * 2;
      const cv = Math.cos(v), sv = Math.sin(v);
      positions.push((R + r * cv) * cu, r * sv, (R + r * cv) * su);
      normals.push(cv * cu, sv, cv * su);
    }
  }
  for (let i = 0; i < segT; i++)
    for (let j = 0; j < segP; j++) {
      const a = i * (segP + 1) + j, b = a + segP + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function orient(m, rotY = 0, translate = [0, 0, 0]) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  return transformMesh(m, (p) => [
    p[0] * c + p[2] * s + translate[0],
    p[1] + translate[1],
    -p[0] * s + p[2] * c + translate[2],
  ]);
}

// —— 内置醒狮部件 ——
// 狮头:头壳 + 吻部 + 额角 + 眼鼓
export function buildHeadMesh() {
  const skull = makeSphere(0.42, 20, 14, [1, 0.92, 1.05]);
  const snout = orient(makeBox(0.4, 0.26, 0.34), 0, [0, -0.1, 0.42]);
  const horn = orient(makeCylinder(0.02, 0.09, 0.34, 10), 0, [0, 0.5, 0.08]);
  const eyeL = orient(makeSphere(0.1, 10, 8), 0, [0.22, 0.1, 0.33]);
  const eyeR = orient(makeSphere(0.1, 10, 8), 0, [-0.22, 0.1, 0.33]);
  const brow = orient(makeTorus(0.3, 0.05, 24, 8), 0, [0, 0.22, 0.28]);
  return mergeMeshes([skull, snout, horn, eyeL, eyeR, brow]);
}

// 前肢:上臂 + 爪掌
export function buildLimbMesh() {
  const upper = makeCylinder(0.09, 0.11, 0.5, 12);
  const paw = orient(makeSphere(0.13, 12, 8, [1, 0.8, 1.3]), 0, [0, -0.3, 0.02]);
  return mergeMeshes([upper, paw]);
}

// 狮尾:尾穗(锥 + 球)
export function buildTailMesh() {
  const tuft = makeCylinder(0.02, 0.14, 0.45, 12);
  const pom = orient(makeSphere(0.12, 12, 8, [1, 1.4, 1]), 0, [0, 0.28, 0]);
  return mergeMeshes([tuft, pom]);
}

// 狮被:沿身体纵向的半筒面片,返回网格 + 每顶点纵向参数 s(0=前端,1=尾端)
export function buildClothMesh(lenSegs = 26, arcSegs = 14) {
  const positions = [], normals = [], indices = [], sParam = [];
  const zFront = 1.0, zBack = -1.35;
  for (let i = 0; i <= lenSegs; i++) {
    const s = i / lenSegs;
    const z = zFront + (zBack - zFront) * s;
    // 中段略鼓,两端略收
    const radius = 0.58 - 0.1 * Math.abs(s - 0.45) * 2;
    const yBase = 0.95 + 0.12 * Math.sin(s * Math.PI);
    for (let j = 0; j <= arcSegs; j++) {
      const a = (-115 + (230 * j) / arcSegs) * (Math.PI / 180);
      const x = Math.sin(a) * radius;
      const y = yBase + Math.cos(a) * radius * 0.75;
      positions.push(x, y, z);
      normals.push(Math.sin(a), Math.cos(a), 0);
      sParam.push(s);
    }
  }
  for (let i = 0; i < lenSegs; i++)
    for (let j = 0; j < arcSegs; j++) {
      const a = i * (arcSegs + 1) + j, b = a + arcSegs + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  return {
    mesh: {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      indices: new Uint16Array(indices),
    },
    sParam: new Float32Array(sParam),
  };
}

// 简易 OBJ 解析(v / f,支持多边形扇形三角化)
export function parseOBJ(text) {
  const vs = [];
  const positions = [], indices = [];
  const remap = new Map();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      vs.push([+x, +y, +z]);
    } else if (line.startsWith('f ')) {
      const refs = line.slice(2).trim().split(/\s+/).map((t) => {
        const i = parseInt(t.split('/')[0], 10);
        return i < 0 ? vs.length + i : i - 1;
      });
      for (let k = 1; k + 1 < refs.length; k++) {
        for (const idx of [refs[0], refs[k], refs[k + 1]]) {
          if (!remap.has(idx)) {
            remap.set(idx, positions.length / 3);
            positions.push(...vs[idx]);
          }
          indices.push(remap.get(idx));
        }
      }
    }
  }
  const pos = new Float32Array(positions);
  const normals = computeNormals(pos, indices);
  return { positions: pos, normals, indices: new Uint16Array(indices) };
}

export function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i] * 3, indices[i + 1] * 3, indices[i + 2] * 3];
    const pA = [positions[a], positions[a + 1], positions[a + 2]];
    const pB = [positions[b], positions[b + 1], positions[b + 2]];
    const pC = [positions[c], positions[c + 1], positions[c + 2]];
    const n = V3.cross(V3.sub(pB, pA), V3.sub(pC, pA));
    for (const o of [a, b, c]) {
      normals[o] += n[0]; normals[o + 1] += n[1]; normals[o + 2] += n[2];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const n = V3.norm([normals[i], normals[i + 1], normals[i + 2]]);
    normals[i] = n[0]; normals[i + 1] = n[1]; normals[i + 2] = n[2];
  }
  return normals;
}
