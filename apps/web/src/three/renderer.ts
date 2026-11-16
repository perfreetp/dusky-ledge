import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPUCapability from 'three/addons/capabilities/WebGPU.js';

/** 场景只需要的最小渲染器接口（屏蔽 WebGPU/WebGL 签名差异） */
export interface MinimalRenderer {
  setPixelRatio(v: number): void;
  setSize(w: number, h: number, updateStyle?: boolean): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose?(): void;
}

export interface RendererContext {
  renderer: MinimalRenderer;
  mode: 'webgpu' | 'webgl2';
}

/** WebGPU 能力探测，不可用时回退 WebGL2 */
export async function createRenderer(canvas: HTMLCanvasElement): Promise<RendererContext> {
  if (WebGPUCapability.isAvailable()) {
    try {
      const webgpuModule = (await import('three/webgpu')) as {
        default?: new (params: { canvas: HTMLCanvasElement; antialias?: boolean }) => MinimalRenderer;
        WebGPURenderer?: new (params: {
          canvas: HTMLCanvasElement;
          antialias?: boolean;
        }) => MinimalRenderer & { init(): Promise<void> };
      };
      const RendererCtor = webgpuModule.WebGPURenderer ?? webgpuModule.default;
      if (RendererCtor) {
        const renderer = new RendererCtor({ canvas, antialias: true }) as MinimalRenderer & {
          init(): Promise<void>;
        };
        await renderer.init();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        return { renderer, mode: 'webgpu' };
      }
    } catch (err) {
      console.warn('[pg] WebGPU 初始化失败，回退 WebGL2:', err);
    }
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return { renderer: renderer as MinimalRenderer, mode: 'webgl2' };
}

export function createScene(canvas: HTMLCanvasElement, renderer: MinimalRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f7fa);

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 5000);
  camera.position.set(260, -320, 220);
  camera.lookAt(100, 60, 40);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(200, -200, 300);
  scene.add(dir);

  const grid = new THREE.GridHelper(800, 32, 0x909399, 0xdcdfe6);
  grid.rotation.x = Math.PI / 2;
  scene.add(grid);
  scene.add(new THREE.AxesHelper(120));

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  };

  return { scene, camera, controls, resize };
}
