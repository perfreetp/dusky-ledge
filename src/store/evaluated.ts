import { createRoot, createSignal } from 'solid-js';
import type { BufferGeometry } from 'three';
import { modelStore } from './model';
import { applyFaceSelection, evaluateCsg, type CsgResult } from '../core/csg';

export interface CacheEntry {
  result: CsgResult;
  geometry: BufferGeometry; // 已应用选中高亮的几何体
  version: number;
  faceRef: unknown;
}

let cache: CacheEntry | null = null;

// 求值失效广播：组件上下文之外的修改也能触发订阅者
export const [evalTick, bumpTick] = createRoot(() => createSignal(0));

function recompute(): CacheEntry {
  const v = modelStore.version();
  const face = modelStore.selectedFace();

  if (!cache || cache.version !== v) {
    cache?.geometry.dispose();
    const result = evaluateCsg(modelStore.model.features, modelStore.model.clip);
    const geometry = applyFaceSelection(result.geometry, face, result.featureToCode);
    cache = { result, geometry, version: v, faceRef: face };
    return cache;
  }

  if (cache.faceRef !== face) {
    const geometry = applyFaceSelection(cache.result.geometry, face, cache.result.featureToCode);
    cache = { ...cache, geometry, faceRef: face };
  }
  return cache;
}

/**
 * 同步返回当前布尔求值结果（带缓存）。
 * 响应式：调用方只要在 JSX、createMemo 或 createEffect 中读取本函数，
 * 即通过内部的 version / selectedFace / evalTick 信号建立订阅，状态变化自动重算。
 */
export function evaluated(): CacheEntry {
  evalTick(); // 订阅广播（非响应式上下文读取无副作用）
  modelStore.version();
  modelStore.selectedFace();
  return recompute();
}

export function bumpEvaluation(): void {
  bumpTick((t) => t + 1);
}
