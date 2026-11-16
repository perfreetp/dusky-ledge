import * as THREE from 'three';
import type { MaterialKey } from '../types';

/** 三种铝艺饰面材质 */
export function createPanelMaterial(key: MaterialKey): THREE.MeshStandardMaterial {
  switch (key) {
    case 'matte-black':
      return new THREE.MeshStandardMaterial({
        color: 0x17181a,
        roughness: 0.88,
        metalness: 0.25,
        side: THREE.DoubleSide,
      });
    case 'champagne':
      return new THREE.MeshStandardMaterial({
        color: 0xd8bd8f,
        roughness: 0.32,
        metalness: 0.9,
        side: THREE.DoubleSide,
      });
    case 'fluoro-gray':
      return new THREE.MeshStandardMaterial({
        color: 0x6d7175,
        roughness: 0.48,
        metalness: 0.65,
        side: THREE.DoubleSide,
      });
  }
}

/** 门框/立柱/横档材质(深灰铝材) */
export function createFrameMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x3a3d40,
    roughness: 0.55,
    metalness: 0.7,
  });
}
