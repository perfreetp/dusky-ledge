import { useEffect, useRef, useState } from 'react';
import type { LayerId, Roadway } from '../core/types';
import type { OrbitState } from '../core/math';
import { OrbitController } from '../renderer/OrbitController';
import { WebGPURenderer, type ClipPlane, type RenderStats } from '../renderer/WebGPURenderer';
import type { SceneMeshes } from '../core/mesh';

export interface ViewportProps {
  scene: SceneMeshes;
  initialCamera: OrbitState;
  layers: Record<LayerId, boolean>;
  solo: LayerId | null;
  highlightRwId: number | null;
  clip: { enabled: boolean; plane: ClipPlane };
  diffTint: Record<number, 'new' | 'abandoned' | null> | null;
  cameraSync?: { cam: OrbitState; nonce: number } | null;
  /** 外部相机同步时是否回传本视口相机（分屏从视口应关闭，避免回环） */
  echoSyncedCamera?: boolean;
  resetNonce?: number;
  onCameraChange?: (cam: OrbitState) => void;
  onPick?: (rw: Roadway | null) => void;
  showStats?: boolean;
  label?: string;
}

export function Viewport3D(props: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGPURenderer | null>(null);
  const controllerRef = useRef<OrbitController | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [lodLabel, setLodLabel] = useState<'高模（拱架+锚杆）' | '简模（降级标记）'>('高模（拱架+锚杆）');
  // 外部相机同步（分屏联动）期间抑制一次回传，避免左右视口回环
  const suppressEcho = useRef(false);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const canvas = canvasRef.current!;
    const renderer = new WebGPURenderer(canvas, props.scene);
    rendererRef.current = renderer;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(64, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(64, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    renderer
      .init()
      .then(() => {
        if (disposed) {
          // StrictMode 双挂载：组件已卸载，立即释放刚初始化的设备
          renderer.destroy();
          return;
        }
        resize();
        const controller = new OrbitController(canvas, propsRef.current.initialCamera);
        controllerRef.current = controller;
        renderer.onStats = (s) => {
          setStats(s);
          // 端到端测试钩子
          (window as unknown as { __gpuStats?: unknown }).__gpuStats = s;
        };
        controller.onPick = (nx, ny) => {
          const r = canvas.getBoundingClientRect();
          const id = renderer.pick(controller.cam, r.width / r.height, nx, ny);
          propsRef.current.onPick?.(id == null ? null : renderer.getRoadway(id));
        };
        controller.onChange = () => {
          if (suppressEcho.current) {
            suppressEcho.current = false;
            return;
          }
          propsRef.current.onCameraChange?.(structuredClone(controller.cam));
        };

        let last = performance.now();
        const loop = (now: number) => {
          if (disposed) return;
          raf = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          resize();
          const r = canvas.getBoundingClientRect();
          const p = propsRef.current;
          renderer.setLayers(p.layers, p.solo);
          renderer.setHighlight(p.highlightRwId);
          renderer.setClip(p.clip.enabled, p.clip.plane);
          renderer.setDiffTint(p.diffTint);
          setLodLabel(controller.cam.radius > 420 ? '简模（降级标记）' : '高模（拱架+锚杆）');
          renderer.render(controller.cam, r.width / Math.max(1, r.height), now / 1000 + dt);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controllerRef.current?.destroy();
      renderer.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scene]);

  // 外部相机同步（分屏联动）：应用同步状态期间抑制一次回传，避免回环
  useEffect(() => {
    if (!props.cameraSync || !controllerRef.current) return;
    suppressEcho.current = true;
    controllerRef.current.cam = structuredClone(props.cameraSync.cam);
  }, [props.cameraSync?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  // 相机复位
  useEffect(() => {
    if (!props.resetNonce || !controllerRef.current) return;
    controllerRef.current.reset();
  }, [props.resetNonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="viewport">
      <canvas ref={canvasRef} />
      {props.label && <div className="viewport-label">{props.label}</div>}
      <div className="viewport-toolbar">
        <button className="tool-btn" title="复位相机" onClick={() => controllerRef.current?.reset()}>⟲ 复位</button>
        <button
          className="tool-btn"
          title="全屏"
          onClick={() => {
            const el = canvasRef.current?.parentElement;
            if (!document.fullscreenElement) el?.requestFullscreen?.();
            else document.exitFullscreen?.();
          }}
        >⛶ 全屏</button>
      </div>
      {error && (
        <div className="viewport-error">
          <b>WebGPU 不可用</b>
          <p>{error}</p>
          <p>请使用最新版 Chrome / Edge（113+）并在 chrome://gpu 确认硬件加速开启。</p>
        </div>
      )}
      {props.showStats && stats && (
        <div className="hud-stats">
          <div>绘制调用 <b>{stats.drawCalls}</b></div>
          <div>可见分段 <b>{stats.visibleSegments}/{stats.totalSegments}</b></div>
          <div>可见索引 <b>{stats.visibleIndices.toLocaleString()}</b></div>
          <div>支护 LOD <b>{lodLabel}</b></div>
          <div>帧耗时 <b>{stats.frameMs.toFixed(2)} ms</b></div>
        </div>
      )}
    </div>
  );
}
