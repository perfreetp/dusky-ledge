import { createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { actions, currentResult, state, subscribeResults } from '../state/store';
import { initGpu, type GpuContext } from '../renderer/gpu';
import { CaveRenderer, type ClipState } from '../renderer/renderer';
import { OrbitCamera } from '../renderer/camera';
import { pickSpeleothem } from '../renderer/picking';
import { v3 } from '../core/vec';
import type { Vec3 } from '../core/geometry';
import { generate } from '../core/generate';
import type { GenResult } from '../types';
import Hud from './Hud';
import SpeleoInspector from './SpeleoInspector';
import TrailEditor from './TrailEditor';

import { css } from '../ui/style';
type Mode = 'orbit' | 'trail' | 'annotate';

/** 把快照重算为场景（几何不入库，按需重生成），带会话级缓存。 */
const snapshotCache = new Map<string, GenResult>();
function sceneForVersion(versionId: string): { id: string; result: GenResult } | null {
  const snap = state.versions.find((v) => v.id === versionId);
  if (!snap) return null;
  let result = snapshotCache.get(versionId);
  if (!result) {
    result = generate(snap.seed, snap.params, snap.overrides);
    snapshotCache.set(versionId, result);
    if (snapshotCache.size > 5) snapshotCache.delete(snapshotCache.keys().next().value!);
  }
  return { id: `ver-${versionId}`, result };
}

export default function Viewport() {
  let canvasRef: HTMLCanvasElement | undefined;
  const [mode, setMode] = createSignal<Mode>('orbit');
  const [error, setError] = createSignal<string | null>(null);
  const [ready, setReady] = createSignal(false);
  let gpu: GpuContext;
  let renderer: CaveRenderer;
  const camera = new OrbitCamera();
  const [, forceTick] = createSignal(0);

  const clip = createMemo<ClipState>(() => {
    const result = currentResult();
    if (!state.section.enabled || !result) return { enabled: false, point: [0, 0, 0], normal: [1, 0, 0] };
    const idx = Math.min(state.section.stationIndex, result.stations.length - 1);
    const st = result.stations[idx]!;
    // 剖切平面垂直于洞道切向，过该站中心
    return { enabled: true, point: st.center, normal: st.tangent };
  });

  const annotationGizmos = createMemo(() => {
    const result = currentResult();
    if (!result) return [];
    return state.annotations
      .filter((a) => a.versionId === state.activeVersionId || state.activeVersionId === null)
      .map((a) => {
        const pos = reprojectAnchor(a.anchor.s, a.anchor.local, result) ?? a.anchor.worldSnapshot;
        const color: [number, number, number, number] =
          a.status === 'resolved' ? [0.56, 0.79, 0.54, 1] : a.status === 'rejected' ? [0.58, 0.63, 0.71, 1] : [0.85, 0.48, 0.42, 1];
        return { position: pos as Vec3, color };
      });
  });

  onMount(async () => {
    try {
      gpu = await initGpu(canvasRef!);
      renderer = new CaveRenderer(canvasRef!, gpu);
      setReady(true);
      let raf = 0;
      const loop = () => {
        drawFrame();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      onCleanup(() => cancelAnimationFrame(raf));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  });

  const unsub = subscribeResults(() => forceTick((n) => n + 1));
  onCleanup(unsub);

  function drawFrame() {
    if (!ready() || !renderer) return;
    renderer.resize();
    const result = currentResult();
    if (!result) return;
    const scene = { id: `work-${state.sceneId}`, result };
    if (state.compare.active && state.compare.leftVersionId && state.compare.rightVersionId) {
      const left = sceneForVersion(state.compare.leftVersionId);
      const right = sceneForVersion(state.compare.rightVersionId);
      if (left && right) {
        camera.aspect = renderer.canvasSize.w / 2 / renderer.canvasSize.h;
        renderer.renderSplit(left, right, camera, state.layers, clip());
        return;
      }
    }
    camera.aspect = renderer.canvasSize.w / renderer.canvasSize.h;
    renderer.render(scene, camera, state.layers, clip(), annotationGizmos());
  }

  // ---- 指针交互 ----
  let dragState: { x: number; y: number; button: number; moved: boolean } | null = null;

  const toNdc = (e: PointerEvent): [number, number] => {
    const rect = canvasRef!.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1)];
  };

  const onPointerDown = (e: PointerEvent) => {
    canvasRef!.setPointerCapture(e.pointerId);
    dragState = { x: e.clientX, y: e.clientY, button: e.button, moved: false };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragState) {
      if (mode() === 'trail') canvasRef!.style.cursor = 'copy';
      return;
    }
    const dx = e.clientX - dragState.x;
    const dy = e.clientY - dragState.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragState.moved = true;
    dragState.x = e.clientX;
    dragState.y = e.clientY;
    if (mode() === 'orbit' || e.button === 2 || e.shiftKey) {
      if (e.shiftKey || e.button === 1) camera.pan(dx, dy);
      else camera.rotate(dx, dy);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasClick = dragState && !dragState.moved;
    dragState = null;
    if (!wasClick || !ready()) return;
    const result = currentResult();
    if (!result) return;
    const [nx, ny] = toNdc(e);
    const ray = camera.ndcRay(nx, ny);

    if (mode() === 'annotate') {
      placeAnnotation(ray, result);
      return;
    }
    if (mode() === 'trail') {
      placeTrailOverride(ray, result);
      return;
    }
    // orbit 模式下单击 = 拾取钟乳石
    const hit = pickSpeleothem(ray, result.speleo.instances);
    actions.selectSpeleo(hit ? hit.instance.id : null);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    camera.zoom(e.deltaY);
  };

  return (
    <div class="viewport-wrap">
      <canvas
        ref={canvasRef}
        class="webgpu"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {error() && (
        <div class="overlay-card" style={css({ top: 16, left: 16, color: 'var(--danger)' })}>
          渲染失败：{error()}
        </div>
      )}
      <div class="overlay-card" style={css({ top: 12, left: 12, display: 'flex', gap: 6 })}>
        <button classList={{ primary: mode() === 'orbit' }} onClick={() => setMode('orbit')}>
          浏览
        </button>
        <button classList={{ primary: mode() === 'trail' }} onClick={() => setMode('trail')}>
          步道改点
        </button>
        <button
          classList={{ primary: mode() === 'annotate' }}
          onClick={() => setMode('annotate')}
          disabled={state.role !== 'reviewer'}
          title={state.role !== 'reviewer' ? '仅审核人可打点批注' : ''}
        >
          批注打点
        </button>
      </div>
      <TrailEditor visible={mode() === 'trail'} />
      <SpeleoInspector />
      <Hud />
    </div>
  );
}

/** 批注锚点重投影：归一化里程 + 站局部偏移 → 世界坐标。 */
function reprojectAnchor(s: number, local: [number, number], result: GenResult): Vec3 | null {
  const stations = result.stations;
  const idx = Math.round(s * (stations.length - 1));
  const st = stations[Math.max(0, Math.min(stations.length - 1, idx))];
  if (!st) return null;
  return v3.add(st.center, v3.add(v3.scale(st.right, local[0]), v3.scale(st.up, local[1])));
}

function placeAnnotation(ray: { origin: Vec3; dir: Vec3 }, result: GenResult): void {
  // 打到洞体 AABB 表面取点（近似洞壁），再换算到站局部坐标
  const hit = rayBoxSurface(ray, result.tunnel.bbox.min, result.tunnel.bbox.max);
  if (!hit) {
    actions.toast('请点击洞体范围内的位置');
    return;
  }
  const total = result.stations[result.stations.length - 1]!.length || 1;
  let best = 0;
  let bestD = Infinity;
  result.stations.forEach((st, i) => {
    const d = v3.dist(st.center, hit);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  const st = result.stations[best]!;
  const d = v3.sub(hit, st.center);
  const local: [number, number] = [v3.dot(d, st.right), v3.dot(d, st.up)];
  const body = prompt('批注内容（审核意见）：');
  if (!body) return;
  const versionId = state.activeVersionId ?? 'workspace';
  actions
    .addAnnotation(versionId, { s: st.length / total, local, worldSnapshot: hit }, body)
    .then(() => actions.toast('批注已保存'));
}

function placeTrailOverride(ray: { origin: Vec3; dir: Vec3 }, result: GenResult): void {
  // 射线与 y = 各站 floorY 平面族求交，选射线参数最小的站，把横向位移写成 override
  let best: { t: number; s: number; lateral: number; up: number } | null = null;
  const total = result.stations[result.stations.length - 1]!.length || 1;
  for (let i = 0; i < result.stations.length; i++) {
    const st = result.stations[i]!;
    const denom = v3.dot(ray.dir, st.up);
    if (Math.abs(denom) < 1e-4) continue;
    const t = v3.dot(v3.sub([st.center[0], st.floorY + 0.06, st.center[2]], ray.origin), st.up) / denom;
    if (t < 0) continue;
    if (!best || t < best.t) {
      const hit = v3.add(ray.origin, v3.scale(ray.dir, t));
      const lateral = v3.dot(v3.sub(hit, st.center), st.right);
      best = { t, s: st.length / total, lateral, up: 0 };
    }
  }
  if (!best) {
    actions.toast('该视角无法投射到步道面，请换个角度');
    return;
  }
  actions.addTrailOverride(best.s, best.lateral, best.up);
  actions.regenerate();
  actions.toast('已添加步道控制点，重新生成中保留该改点');
}

function rayBoxSurface(ray: { origin: Vec3; dir: Vec3 }, min: Vec3, max: Vec3): Vec3 | null {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / (ray.dir[i] || 1e-12);
    let t1 = (min[i] - ray.origin[i]) * inv;
    let t2 = (max[i] - ray.origin[i]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  }
  if (tmax < Math.max(tmin, 0)) return null;
  const t = Math.max(tmin, 0);
  return v3.add(ray.origin, v3.scale(ray.dir, t));
}
