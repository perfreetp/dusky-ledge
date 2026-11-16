import * as THREE from 'three';
import type { LightMode } from '../types';

export interface LightRig {
  group: THREE.Group;
  setMode(mode: LightMode): void;
}

/**
 * 两套光源:
 *  - sun:   正午日光(高角度平行光 + 天空环境光)
 *  - spots: 射灯(三盏暖色聚光灯,夜间展厅效果)
 * 两种模式都投射阴影,可观察镂空投影。
 */
export function createLightRig(sceneCenter: THREE.Vector3): LightRig {
  const group = new THREE.Group();

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  group.add(ambient);

  // 正午日光
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
  sun.position.copy(sceneCenter).add(new THREE.Vector3(600, 2200, 1400));
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -2200;
  sun.shadow.camera.right = 2200;
  sun.shadow.camera.top = 2200;
  sun.shadow.camera.bottom = -2200;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 6000;
  sun.shadow.bias = -0.0005;
  const sunTarget = new THREE.Object3D();
  sunTarget.position.copy(sceneCenter);
  sun.target = sunTarget;
  group.add(sun, sunTarget);

  const skyFill = new THREE.HemisphereLight(0xbfd6ff, 0x8a7f6a, 0.7);
  group.add(skyFill);

  // 射灯组
  const spots: THREE.SpotLight[] = [];
  const spotDefs = [
    { pos: new THREE.Vector3(-1400, 1600, 1600), angle: 0.5 },
    { pos: new THREE.Vector3(1400, 1600, 1600), angle: 0.5 },
    { pos: new THREE.Vector3(0, 2200, 900), angle: 0.45 },
  ];
  for (const def of spotDefs) {
    const s = new THREE.SpotLight(0xffd9a0, 0, 0, def.angle, 0.45, 1.2);
    s.position.copy(sceneCenter).add(def.pos);
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0004;
    const t = new THREE.Object3D();
    t.position.copy(sceneCenter);
    s.target = t;
    group.add(s, t);
    spots.push(s);
  }

  const setMode = (mode: LightMode) => {
    if (mode === 'sun') {
      sun.intensity = 2.6;
      skyFill.intensity = 0.7;
      ambient.intensity = 0.25;
      for (const s of spots) s.intensity = 0;
    } else {
      sun.intensity = 0.15;
      skyFill.intensity = 0.12;
      ambient.intensity = 0.08;
      for (const s of spots) s.intensity = 900;
    }
  };
  setMode('sun');

  return { group, setMode };
}
