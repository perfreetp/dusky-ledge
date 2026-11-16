import { createStore, produce } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { FaceRef, Feature, ModelState, PrimitiveType, Vec3Tuple } from '../core/types';
import { defaultDims, featureLabel } from '../core/geometry';
import { uid } from '../core/uid';

const HISTORY_LIMIT = 100;

// Solid store 是 Proxy，structuredClone 无法处理；模型为纯 JSON 数据，用 JSON 深拷贝
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function initialModel(): ModelState {
  return {
    featureSeq: 0,
    features: [],
    clip: {
      enabled: false,
      point: [0, 0, 0],
      normal: [0, -1, 0],
      showHatch: true,
      hatchGap: 6,
    },
  };
}

const [model, setModel] = createStore<ModelState>(initialModel());
const [selectedFace, setSelectedFace] = createSignal<FaceRef | null>(null);
const [selectedFeatureId, setSelectedFeatureId] = createSignal<string | null>(null);
const [snappingEnabled, setSnappingEnabled] = createSignal(true);
const [version, setVersion] = createSignal(0);

let past: ModelState[] = [];
let future: ModelState[] = [];
const [canUndo, setCanUndo] = createSignal(false);
const [canRedo, setCanRedo] = createSignal(false);
let gesturing = false;

function refreshFlags(): void {
  setCanUndo(past.length > 0);
  setCanRedo(future.length > 0);
}

function bump(): void {
  setVersion((v) => v + 1);
}

/** 在一次连续修改前调用，整段手势只压栈一次 */
function pushHistory(): void {
  if (gesturing) return;
  past.push(clone(model));
  if (past.length > HISTORY_LIMIT) past.shift();
  future = [];
  refreshFlags();
}

function beginGesture(): void {
  if (!gesturing) {
    pushHistory();
    gesturing = true;
  }
}

function endGesture(): void {
  gesturing = false;
  bump();
}

function commit(): void {
  if (!gesturing) bump();
}

// ---------------- 特征操作 ----------------

function addFeature(type: PrimitiveType, position: Vec3Tuple, op: Feature['op'] = 'add'): Feature {
  pushHistory();
  const seq = model.featureSeq + 1;
  const feature: Feature = {
    id: uid('feat'),
    type,
    op: model.features.length === 0 ? 'add' : op,
    name: featureLabel(type, seq),
    dims: defaultDims(type),
    position: [...position],
  };
  setModel(
    produce((m) => {
      m.featureSeq = seq;
      m.features.push(feature);
    }),
  );
  setSelectedFeatureId(feature.id);
  setSelectedFace(null);
  commit();
  return feature;
}

function removeFeature(id: string): void {
  pushHistory();
  setModel(
    produce((m) => {
      m.features = m.features.filter((f) => f.id !== id);
      if (m.features.length > 0) m.features[0].op = 'add';
    }),
  );
  if (selectedFeatureId() === id) setSelectedFeatureId(null);
  setSelectedFace(null);
  commit();
}

function updateFeature(id: string, patch: Partial<Omit<Feature, 'id'>>, gesture = false): void {
  if (gesture) beginGesture();
  else pushHistory();
  setModel(
    produce((m) => {
      const f = m.features.find((x) => x.id === id);
      if (!f) return;
      Object.assign(f, patch);
      if (patch.dims) f.dims = { ...patch.dims } as Feature['dims'];
      if (patch.position) f.position = [...patch.position];
    }),
  );
  commit();
}

/** 直接替换整个特征（拖拽改尺寸用，走同一条历史栈） */
function replaceFeature(feature: Feature, gesture: boolean): void {
  if (gesture) beginGesture();
  else pushHistory();
  setModel(
    produce((m) => {
      const i = m.features.findIndex((x) => x.id === feature.id);
      if (i >= 0) m.features[i] = clone(feature);
    }),
  );
  commit();
}

function moveFeature(id: string, position: Vec3Tuple, gesture: boolean): void {
  if (gesture) beginGesture();
  else pushHistory();
  setModel(
    produce((m) => {
      const f = m.features.find((x) => x.id === id);
      if (f) f.position = [...position];
    }),
  );
  commit();
}

function setClip(patch: Partial<ModelState['clip']>): void {
  pushHistory();
  setModel(
    produce((m) => {
      Object.assign(m.clip, patch);
    }),
  );
  commit();
}

// ---------------- 撤销 / 重做 / 载入 ----------------

function undo(): void {
  const prev = past.pop();
  if (!prev) return;
  future.push(clone(model));
  setModel(clone(prev));
  setSelectedFace(null);
  refreshFlags();
  bump();
}

function redo(): void {
  const next = future.pop();
  if (!next) return;
  past.push(clone(model));
  setModel(clone(next));
  setSelectedFace(null);
  refreshFlags();
  bump();
}

function resetModel(): void {
  pushHistory();
  setModel(initialModel());
  setSelectedFace(null);
  setSelectedFeatureId(null);
  commit();
}

function loadModel(m: ModelState): void {
  past = [];
  future = [];
  gesturing = false;
  setModel(clone(m));
  setSelectedFace(null);
  setSelectedFeatureId(null);
  refreshFlags();
  bump();
}

export const modelStore = {
  model,
  version,
  selectedFace,
  setSelectedFace,
  selectedFeatureId,
  setSelectedFeatureId,
  snappingEnabled,
  setSnappingEnabled,
  canUndo,
  canRedo,
  addFeature,
  removeFeature,
  updateFeature,
  replaceFeature,
  moveFeature,
  setClip,
  undo,
  redo,
  resetModel,
  loadModel,
  beginGesture,
  endGesture,
};
