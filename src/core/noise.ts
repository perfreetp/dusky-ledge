/**
 * 确定性 3D 梯度噪声（Perlin 风格）与 fBm。
 * 格点哈希全部走 splitmix32，无任何非确定源；同输入永远同输出。
 */
import { splitmix32 } from './rng';

/** 整数格点 hash → [0,1)。 */
function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = seed | 0;
  h = splitmix32(h ^ Math.imul(ix, 0x27d4eb2d));
  h = splitmix32(h ^ Math.imul(iy, 0x165667b1));
  h = splitmix32(h ^ Math.imul(iz, 0x8fbc7a51));
  return h / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 基于格点 hash 构造的伪随机梯度点积，避免存梯度表。 */
function grad(ix: number, iy: number, iz: number, x: number, y: number, z: number, seed: number): number {
  const h = hash3(ix, iy, iz, seed);
  // 把 [0,1) 映射到 12 个主方向之一的近似（用角度确定性推导梯度向量）
  const az = h * Math.PI * 2;
  const el = (hash3(ix + 17, iy + 31, iz + 53, seed) - 0.5) * Math.PI;
  const gx = Math.cos(el) * Math.cos(az);
  const gy = Math.sin(el);
  const gz = Math.cos(el) * Math.sin(az);
  return gx * x + gy * y + gz * z;
}

/** 单次 3D 梯度噪声，返回约 [-1,1]。 */
export function noise3(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const u = fade(fx);
  const v = fade(fy);
  const w = fade(fz);

  let acc = 0;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const d = grad(x0 + dx, y0 + dy, z0 + dz, fx - dx, fy - dy, fz - dz, seed);
        // 三线性插值权重
        const wx = dx === 0 ? 1 - u : u;
        const wy = dy === 0 ? 1 - v : v;
        const wz = dz === 0 ? 1 - w : w;
        acc += d * wx * wy * wz;
      }
    }
  }
  return acc;
}

/** 分形布朗运动：octaves 层倍频叠加，归一化到约 [-1,1]。 */
export function fbm3(
  x: number,
  y: number,
  z: number,
  seed: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(x * freq, y * freq, z * freq, splitmix32(seed + o * 7919));
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
