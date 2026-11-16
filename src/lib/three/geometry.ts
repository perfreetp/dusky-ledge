import * as THREE from 'three';
import type { FeatureType } from '../types';

/** LOD 档位：0 包围盒 / 1 简化网衣 / 2 完整网格 */
export type LodLevel = 0 | 1 | 2;
export type PartKey = string; // `${type}:${lod}:${partIndex}`

function unitBox(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(1, 1, 1);
}

/** 开口圆柱，单位半径、单位高度，底部落在 y=-1、顶部 y=0 */
function netCylinder(radial: number, heightSeg: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, radial, heightSeg, true);
  g.translate(0, -0.5, 0);
  return g;
}

function collarTorus(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(1, 0.06, 6, 24);
  g.rotateX(Math.PI / 2);
  return g;
}

function flatPlane(): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  return g;
}

export interface GeometryPart {
  key: PartKey;
  geometry: THREE.BufferGeometry;
  transparent: boolean;
  wireframe: boolean;
}

export interface BucketGeometry {
  type: FeatureType;
  lod: LodLevel;
  parts: GeometryPart[];
}

/**
 * 全部几何体均为单位尺寸，世界尺度靠每实例矩阵缩放完成，
 * 这样一个 InstancedMesh 就能容纳同类型全部要素。
 */
export function buildBucketGeometries(): BucketGeometry[] {
  const buckets: BucketGeometry[] = [];
  const push = (type: FeatureType, lod: LodLevel, parts: Omit<GeometryPart, 'key'>[]) => {
    buckets.push({
      type,
      lod,
      parts: parts.map((p, i) => ({ ...p, key: `${type}:${lod}:${i}` }))
    });
  };

  // ---------- 网箱 ----------
  push('cage', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('cage', 1, [
    { geometry: netCylinder(8, 1), transparent: true, wireframe: true },
    { geometry: collarTorus(), transparent: false, wireframe: false }
  ]);
  push('cage', 2, [
    { geometry: netCylinder(24, 6), transparent: true, wireframe: true },
    { geometry: collarTorus(), transparent: false, wireframe: false },
    { geometry: collarTorus(), transparent: true, wireframe: true } // 底圈
  ]);

  // ---------- 浮标 ----------
  push('buoy', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('buoy', 1, [{ geometry: new THREE.SphereGeometry(1, 10, 8), transparent: false, wireframe: false }]);
  push('buoy', 2, [
    { geometry: new THREE.SphereGeometry(1, 18, 12), transparent: false, wireframe: false },
    { geometry: new THREE.CylinderGeometry(0.09, 0.09, 1, 6), transparent: false, wireframe: false }
  ]);

  // ---------- 锚链（单位圆柱沿 +Y，朝向用四元数拧到锚点方向）----------
  push('chain', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('chain', 1, [{ geometry: new THREE.CylinderGeometry(1, 1, 1, 4), transparent: false, wireframe: false }]);
  push('chain', 2, [{ geometry: new THREE.CylinderGeometry(1, 1, 1, 8), transparent: false, wireframe: true }]);

  // ---------- 航标 ----------
  push('marker', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('marker', 1, [
    { geometry: new THREE.CylinderGeometry(1, 1, 1, 8), transparent: false, wireframe: false },
    { geometry: new THREE.ConeGeometry(1, 1, 10), transparent: false, wireframe: false }
  ]);
  push('marker', 2, [
    { geometry: new THREE.CylinderGeometry(1, 1, 1, 16), transparent: false, wireframe: false },
    { geometry: new THREE.ConeGeometry(1, 1, 16), transparent: false, wireframe: false },
    { geometry: new THREE.SphereGeometry(1, 12, 8), transparent: false, wireframe: false }
  ]);

  // ---------- 警戒区 ----------
  push('warningZone', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('warningZone', 1, [
    { geometry: netCylinder(16, 1), transparent: true, wireframe: true }
  ]);
  push('warningZone', 2, [
    { geometry: netCylinder(40, 1), transparent: true, wireframe: false },
    { geometry: collarTorus(), transparent: false, wireframe: false },
    { geometry: collarTorus(), transparent: false, wireframe: false }
  ]);

  // ---------- 航道 ----------
  push('channel', 0, [{ geometry: unitBox(), transparent: true, wireframe: true }]);
  push('channel', 1, [{ geometry: flatPlane(), transparent: true, wireframe: false }]);
  push('channel', 2, [
    { geometry: flatPlane(), transparent: true, wireframe: false },
    { geometry: unitBox(), transparent: false, wireframe: false },
    { geometry: unitBox(), transparent: false, wireframe: false }
  ]);

  return buckets;
}
