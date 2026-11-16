// 仅开发环境挂载到 window 的测试/调试钩子，生产构建不暴露
import { modelStore } from './store/model';
import { eduStore } from './store/education';
import { evaluated } from './store/evaluated';
import { collectSnapPoints, resizeByFace } from './core/geometry';
import { generateThreeViewSVG } from './three/orthographic';
import * as THREE from 'three';

export function installTestHooks(): void {
  if (!import.meta.env.DEV) return;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  (window as unknown as Record<string, unknown>).__mc3d = {
    THREE,
    modelStore,
    eduStore,
    evaluated,
    collectSnapPoints,
    resizeByFace,
    generateSVG: () => {
      scene.clear();
      return generateThreeViewSVG(renderer, scene);
    },
  };
}
