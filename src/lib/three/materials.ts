import * as THREE from 'three';

export interface EngineMaterials {
  /** LOD0 包围盒线框 */
  box: THREE.MeshBasicMaterial;
  /** 半透明网衣/壁面（深度排序、不写深度防串色） */
  net: THREE.MeshBasicMaterial;
  wall: THREE.MeshBasicMaterial;
  plane: THREE.MeshBasicMaterial;
  /** 实体件 */
  solid: THREE.MeshLambertMaterial;
  /** 选中高亮描边盒 */
  highlight: THREE.MeshBasicMaterial;
  /** 测距/圈退辅助 */
  measureLine: THREE.LineBasicMaterial;
  measurePoint: THREE.MeshBasicMaterial;
  reworkLine: THREE.LineBasicMaterial;
  reworkDisk: THREE.MeshBasicMaterial;
  draftLine: THREE.LineBasicMaterial;
}

export function buildMaterials(): EngineMaterials {
  return {
    box: new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    }),
    net: new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    wall: new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    plane: new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    solid: new THREE.MeshLambertMaterial(),
    highlight: new THREE.MeshBasicMaterial({
      color: 0xffe14d,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    }),
    measureLine: new THREE.LineBasicMaterial({ color: 0xffffff }),
    measurePoint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    reworkLine: new THREE.LineBasicMaterial({ color: 0xff3b4e }),
    reworkDisk: new THREE.MeshBasicMaterial({
      color: 0xff3b4e,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide
    }),
    draftLine: new THREE.LineBasicMaterial({ color: 0xff9a3c })
  };
}
