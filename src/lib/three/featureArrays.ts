import * as THREE from 'three';
import { FEATURE_TYPES, LAYERS, LOD_SQ } from '../config';
import type { Feature, FeatureType, LayerId } from '../types';
import type { LodLevel } from './geometry';

export const TYPE_ORDER: FeatureType[] = [
  'cage',
  'buoy',
  'chain',
  'marker',
  'warningZone',
  'channel'
];
export const LAYER_ORDER: LayerId[] = LAYERS.map((l) => l.id);
export const LOD_COUNT = 3;

const TYPE_INDEX: Record<FeatureType, number> = Object.fromEntries(
  TYPE_ORDER.map((t, i) => [t, i])
) as Record<FeatureType, number>;
const LAYER_INDEX: Record<LayerId, number> = Object.fromEntries(
  LAYER_ORDER.map((t, i) => [t, i])
) as Record<LayerId, number>;

/** type*3+lod -> 桶槽位 */
export function bucketSlot(typeIndex: number, lod: LodLevel): number {
  return typeIndex * LOD_COUNT + lod;
}

/**
 * 上万要素的并行数组表示：剔除、LOD 分档与实例矩阵构建全部走
 * TypedArray，避免逐对象属性访问与 GC 压力。
 */
export class FeatureArrays {
  count = 0;
  ids: string[] = [];
  idToIndex = new Map<string, number>();
  typeIndex = new Uint8Array(0);
  layerIndex = new Uint8Array(0);

  x = new Float32Array(0);
  y = new Float32Array(0);
  z = new Float32Array(0);
  radius = new Float32Array(0);
  depth = new Float32Array(0);
  heading = new Float32Array(0);
  ex = new Float32Array(0);
  ez = new Float32Array(0);
  sy = new Float32Array(0);
  sx = new Float32Array(0);
  sz = new Float32Array(0);

  // 包围球（视锥剔除）与包围盒（描边盒/框选）
  cxCenter = new Float32Array(0);
  cyCenter = new Float32Array(0);
  czCenter = new Float32Array(0);
  cRadius = new Float32Array(0);
  bMinX = new Float32Array(0);
  bMaxX = new Float32Array(0);
  bMinY = new Float32Array(0);
  bMaxY = new Float32Array(0);
  bMinZ = new Float32Array(0);
  bMaxZ = new Float32Array(0);

  colors = new Float32Array(0);

  /** 每帧重算：1=可见，0=被剔除或图层关闭 */
  visible = new Uint8Array(0);
  /** 每帧重算：0 包围盒 / 1 简化 / 2 完整 */
  level = new Uint8Array(0);

  layerOn = [true, true, true, true];

  /** 18 个 (type,lod) 桶，各桶记录本帧命中的要素索引 */
  private bucketData: Int32Array[] = [];
  private bucketCounts = new Int32Array(TYPE_ORDER.length * LOD_COUNT);

  private tmpSphere = new THREE.Sphere();
  private tmpCenter = new THREE.Vector3();

  constructor(features: Feature[]) {
    const n = features.length;
    this.count = n;
    this.typeIndex = new Uint8Array(n);
    this.layerIndex = new Uint8Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.z = new Float32Array(n);
    this.radius = new Float32Array(n);
    this.depth = new Float32Array(n);
    this.heading = new Float32Array(n);
    this.ex = new Float32Array(n);
    this.ez = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.sz = new Float32Array(n);
    this.sx = new Float32Array(n);
    this.cxCenter = new Float32Array(n);
    this.cyCenter = new Float32Array(n);
    this.czCenter = new Float32Array(n);
    this.cRadius = new Float32Array(n);
    this.bMinX = new Float32Array(n);
    this.bMaxX = new Float32Array(n);
    this.bMinY = new Float32Array(n);
    this.bMaxY = new Float32Array(n);
    this.bMinZ = new Float32Array(n);
    this.bMaxZ = new Float32Array(n);
    this.colors = new Float32Array(n * 3);
    this.visible = new Uint8Array(n);
    this.level = new Uint8Array(n);

    for (let b = 0; b < TYPE_ORDER.length * LOD_COUNT; b++) {
      this.bucketData.push(new Int32Array(n));
    }

    features.forEach((f, i) => this.loadOne(f, i));
  }

  private loadOne(f: Feature, i: number) {
    this.ids.push(f.id);
    this.idToIndex.set(f.id, i);
    this.typeIndex[i] = TYPE_INDEX[f.type];
    this.layerIndex[i] = LAYER_INDEX[f.layer];
    this.x[i] = f.x;
    this.y[i] = f.y;
    this.z[i] = f.z;
    this.radius[i] = f.radius;
    this.depth[i] = f.depth;
    this.heading[i] = f.heading;
    this.ex[i] = f.extra?.ex ?? 0;
    this.ez[i] = f.extra?.ez ?? 0;
    this.sy[i] = f.extra?.sy ?? 1;
    this.sx[i] = f.extra?.sx ?? 1;
    this.sz[i] = f.extra?.sz ?? 1;

    let minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number;
    const r = f.radius;
    switch (f.type) {
      case 'cage':
        minX = f.x - r * 1.15; maxX = f.x + r * 1.15;
        minZ = f.z - r * 1.15; maxZ = f.z + r * 1.15;
        minY = f.y - f.depth; maxY = f.y + 2;
        break;
      case 'buoy':
        minX = f.x - r * 1.3; maxX = f.x + r * 1.3;
        minZ = f.z - r * 1.3; maxZ = f.z + r * 1.3;
        minY = f.y - 2; maxY = f.y + r * 2.4;
        break;
      case 'chain': {
        const bx = f.x + (f.extra?.ex ?? 0);
        const bz = f.z + (f.extra?.ez ?? 0);
        minX = Math.min(f.x, bx) - 2; maxX = Math.max(f.x, bx) + 2;
        minZ = Math.min(f.z, bz) - 2; maxZ = Math.max(f.z, bz) + 2;
        minY = f.y - f.depth - 2; maxY = f.y + 2;
        break;
      }
      case 'marker':
        minX = f.x - r * 1.3; maxX = f.x + r * 1.3;
        minZ = f.z - r * 1.3; maxZ = f.z + r * 1.3;
        minY = f.y - 1; maxY = f.y + f.depth + r * 1.6;
        break;
      case 'warningZone':
        minX = f.x - r; maxX = f.x + r;
        minZ = f.z - r; maxZ = f.z + r;
        minY = f.y - f.depth; maxY = f.y + 2;
        break;
      case 'channel': {
        const hx = f.extra?.sx ?? r;
        const hz = f.extra?.sz ?? r;
        minX = f.x - hx; maxX = f.x + hx;
        minZ = f.z - hz; maxZ = f.z + hz;
        minY = f.y - 0.5; maxY = f.y + 1;
        break;
      }
    }
    this.bMinX[i] = minX; this.bMaxX[i] = maxX;
    this.bMinY[i] = minY; this.bMaxY[i] = maxY;
    this.bMinZ[i] = minZ; this.bMaxZ[i] = maxZ;
    this.cxCenter[i] = (minX + maxX) / 2;
    this.cyCenter[i] = (minY + maxY) / 2;
    this.czCenter[i] = (minZ + maxZ) / 2;
    const dx = (maxX - minX) / 2;
    const dy = (maxY - minY) / 2;
    const dz = (maxZ - minZ) / 2;
    this.cRadius[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const c = new THREE.Color(FEATURE_TYPES[f.type].color);
    this.colors[i * 3] = c.r;
    this.colors[i * 3 + 1] = c.g;
    this.colors[i * 3 + 2] = c.b;
  }

  setLayerOn(layer: LayerId, on: boolean) {
    this.layerOn[LAYER_INDEX[layer]] = on;
  }

  /** 框选批量改图层归属后，同步内部图层索引 */
  setLayerOf(index: number, layer: LayerId) {
    this.layerIndex[index] = LAYER_INDEX[layer];
  }

  typeOf(i: number): FeatureType {
    return TYPE_ORDER[this.typeIndex[i]];
  }

  layerOf(i: number): LayerId {
    return LAYER_ORDER[this.layerIndex[i]];
  }

  listFor(typeIndex: number, lod: LodLevel): { arr: Int32Array; count: number } {
    const slot = bucketSlot(typeIndex, lod);
    return { arr: this.bucketData[slot], count: this.bucketCounts[slot] };
  }

  /**
   * 视锥剔除 + 距离三档 LOD + 图层开关，结果写入 18 个桶。
   * 关闭的图层 visible=0，天然不参与后续拾取与框选。
   */
  cullAndLod(camera: THREE.PerspectiveCamera, frustum: THREE.Frustum): number {
    this.bucketCounts.fill(0);
    const pos = camera.position;
    let drawn = 0;
    const n = this.count;

    for (let i = 0; i < n; i++) {
      if (!this.layerOn[this.layerIndex[i]]) {
        this.visible[i] = 0;
        continue;
      }
      this.tmpCenter.set(this.cxCenter[i], this.cyCenter[i], this.czCenter[i]);
      this.tmpSphere.center.copy(this.tmpCenter);
      this.tmpSphere.radius = this.cRadius[i];
      if (!frustum.intersectsSphere(this.tmpSphere)) {
        this.visible[i] = 0;
        continue;
      }
      this.visible[i] = 1;
      const dx = pos.x - this.x[i];
      const dy = pos.y - this.y[i];
      const dz = pos.z - this.z[i];
      const dSq = dx * dx + dy * dy + dz * dz;
      const level: LodLevel = dSq <= LOD_SQ.NEAR ? 2 : dSq <= LOD_SQ.FAR ? 1 : 0;
      this.level[i] = level;

      const slot = bucketSlot(this.typeIndex[i], level);
      this.bucketData[slot][this.bucketCounts[slot]++] = i;
      drawn++;
    }
    return drawn;
  }
}
