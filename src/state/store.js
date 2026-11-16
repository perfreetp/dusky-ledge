// 中央状态:骨架 / 部件 / 动画 / 动作库 / 质检
import { createStore } from 'solid-js/store';
import { createSignal } from 'solid-js';
import { makeKey, upsertKey, sortKeys, ensureTrack, evalPose, mirrorAnimation, evalTrack } from '../core/animation.js';
import { clampToLimits, mirrorPair } from '../core/skeleton.js';
import { runChecks } from '../qc/checks.js';
import { saveProject, loadProject, saveLibrary, loadLibrary } from '../core/storage.js';
import { buildClothMesh } from '../core/mesh.js';
import { computeClothWeights } from '../core/skinning.js';

let seq = 0;
export const uid = (p) => `${p}_${++seq}_${Math.floor(performance.now()) % 100000}`;

// —— 默认骨架(狮头链 + 前肢 + 狮尾链)——
function defaultBones() {
  const B = (id, name, parentId, pos, limits) => ({
    id, name, parentId, pos, rot: [0, 0, 0],
    limits: limits || { x: [-90, 90], y: [-90, 90], z: [-90, 90] },
  });
  const bones = {
    root: B('root', '躯干根', null, [0, 1.0, 0], { x: [-30, 30], y: [-60, 60], z: [-25, 25] }),
    neck: B('neck', '颈', 'root', [0, 0.25, 0.55], { x: [-40, 35], y: [-50, 50], z: [-30, 30] }),
    head: B('head', '头', 'neck', [0, 0.15, 0.35], { x: [-35, 40], y: [-60, 60], z: [-35, 35] }),
    jaw: B('jaw', '下颌', 'head', [0, -0.1, 0.25], { x: [0, 45], y: [-5, 5], z: [-5, 5] }),
    frontLegL: B('frontLegL', '左前肢', 'root', [0.35, -0.15, 0.45], { x: [-60, 60], y: [-30, 30], z: [-70, 20] }),
    frontLegR: B('frontLegR', '右前肢', 'root', [-0.35, -0.15, 0.45], { x: [-60, 60], y: [-30, 30], z: [-20, 70] }),
    tailBase: B('tailBase', '尾根', 'root', [0, 0.1, -0.6], { x: [-25, 25], y: [-45, 45], z: [-20, 20] }),
    tail1: B('tail1', '尾节一', 'tailBase', [0, 0.05, -0.4], { x: [-30, 30], y: [-50, 50], z: [-25, 25] }),
    tail2: B('tail2', '尾节二', 'tail1', [0, 0.05, -0.35], { x: [-30, 30], y: [-55, 55], z: [-25, 25] }),
    tail3: B('tail3', '尾尖', 'tail2', [0, 0.05, -0.3], { x: [-35, 35], y: [-60, 60], z: [-30, 30] }),
  };
  return {
    bones,
    boneOrder: ['root', 'neck', 'head', 'jaw', 'frontLegL', 'frontLegR', 'tailBase', 'tail1', 'tail2', 'tail3'],
  };
}

function defaultParts() {
  const P = (id, name, kind, boneId, mesh) => ({
    id, name, kind, boneId, mesh,
    offsetPos: [0, 0, 0], offsetRot: [0, 0, 0], visible: true,
  });
  const parts = {
    part_head: P('part_head', '狮头', 'head', 'head', 'builtin:head'),
    part_legL: P('part_legL', '左前肢', 'limb', 'frontLegL', 'builtin:limb'),
    part_legR: P('part_legR', '右前肢', 'limb', 'frontLegR', 'builtin:limb'),
    part_cloth: P('part_cloth', '狮被', 'cloth', null, 'builtin:cloth'),
    part_tail: P('part_tail', '狮尾', 'tail', 'tail2', 'builtin:tail'),
  };
  return { parts, partOrder: ['part_head', 'part_legL', 'part_legR', 'part_cloth', 'part_tail'] };
}

function emptyAnim(name = '未命名动作') {
  return { id: uid('anim'), name, fps: 24, frames: 72, loop: [0, 72], tracks: {} };
}

// 示例动画:点头 + 摆尾 + 张合下颌
function sampleAnim() {
  const a = emptyAnim('示例-醒狮抖擞');
  const add = (bone, kind, f, v, mode = 'bezier') => {
    ensureTrack(a, bone, kind).push(makeKey(f, v, mode));
  };
  add('neck', 'rot', 0, [0, 0, 0]);
  add('neck', 'rot', 18, [-22, 0, 0]);
  add('neck', 'rot', 36, [6, 0, 0]);
  add('neck', 'rot', 54, [-16, 0, 0]);
  add('neck', 'rot', 72, [0, 0, 0]);
  add('head', 'rot', 0, [0, -14, 0]);
  add('head', 'rot', 24, [8, 14, 6]);
  add('head', 'rot', 48, [-6, -12, -6]);
  add('head', 'rot', 72, [0, -14, 0]);
  add('jaw', 'rot', 0, [0, 0, 0], 'ease');
  add('jaw', 'rot', 12, [32, 0, 0], 'ease');
  add('jaw', 'rot', 24, [0, 0, 0], 'ease');
  add('jaw', 'rot', 48, [28, 0, 0], 'ease');
  add('jaw', 'rot', 60, [0, 0, 0], 'ease');
  add('jaw', 'rot', 72, [0, 0, 0], 'ease');
  add('tailBase', 'rot', 0, [0, -18, 0]);
  add('tailBase', 'rot', 18, [0, 18, 0]);
  add('tailBase', 'rot', 36, [0, -18, 0]);
  add('tailBase', 'rot', 54, [0, 18, 0]);
  add('tailBase', 'rot', 72, [0, -18, 0]);
  add('tail1', 'rot', 0, [0, -12, 0]);
  add('tail1', 'rot', 18, [0, 14, 0]);
  add('tail1', 'rot', 36, [0, -12, 0]);
  add('tail1', 'rot', 54, [0, 14, 0]);
  add('tail1', 'rot', 72, [0, -12, 0]);
  add('root', 'pos', 0, [0, 1.0, 0]);
  add('root', 'pos', 36, [0, 0.92, 0]);
  add('root', 'pos', 72, [0, 1.0, 0]);
  add('root', 'rot', 0, [0, 0, 0]);
  add('root', 'rot', 36, [4, 0, 3]);
  add('root', 'rot', 72, [0, 0, 0]);
  add('frontLegL', 'rot', 0, [0, 0, 0]);
  add('frontLegL', 'rot', 36, [-14, 0, -8]);
  add('frontLegL', 'rot', 72, [0, 0, 0]);
  add('frontLegR', 'rot', 0, [0, 0, 0]);
  add('frontLegR', 'rot', 36, [-14, 0, 8]);
  add('frontLegR', 'rot', 72, [0, 0, 0]);
  add('tail2', 'rot', 0, [0, -10, 0]);
  add('tail2', 'rot', 18, [0, 12, 0]);
  add('tail2', 'rot', 36, [0, -10, 0]);
  add('tail2', 'rot', 54, [0, 12, 0]);
  add('tail2', 'rot', 72, [0, -10, 0]);
  add('tail3', 'rot', 0, [0, -8, 0]);
  add('tail3', 'rot', 18, [0, 10, 0]);
  add('tail3', 'rot', 36, [0, -8, 0]);
  add('tail3', 'rot', 54, [0, 10, 0]);
  add('tail3', 'rot', 72, [0, -8, 0]);
  for (const t of Object.values(a.tracks)) { sortKeys(t.pos); sortKeys(t.rot); }
  return a;
}

function defaultState() {
  const { bones, boneOrder } = defaultBones();
  const { parts, partOrder } = defaultParts();
  return {
    ui: {
      tab: 'editor',
      mode: 'anim',
      selectedBone: 'neck',
      selectedPart: null,
      autoKey: true,
      playing: false,
      frame: 0,
      showBones: true,
      showGrid: true,
      enforceLimits: true,
      timelineSel: [],
      keyClipboard: null,
      curve: { boneId: 'neck', kind: 'rot', comp: 0 },
      inspectorBoneLimitAxis: 'x',
    },
    bones, boneOrder,
    parts, partOrder,
    anim: sampleAnim(),
    library: [],
    qc: { batch: [], issues: [], ran: false, finished: null },
  };
}

const saved = loadProject();
const initial = saved || defaultState();
initial.library = loadLibrary();
if (!initial.qc) initial.qc = { batch: [], issues: [], ran: false, finished: null };
if (!initial.ui) initial.ui = defaultState().ui;
initial.ui.playing = false;
initial.ui.timelineSel = [];
initial.ui.keyClipboard = null;

export const [state, setState] = createStore(initial);

// 非响应式:狮被几何与蒙皮权重(常量;rest 数据必须独立拷贝,蒙皮每帧会改写 mesh)
const clothGeo = buildClothMesh();
export const cloth = {
  mesh: {
    positions: clothGeo.mesh.positions.slice(),
    normals: clothGeo.mesh.normals.slice(),
    indices: clothGeo.mesh.indices,
  },
  restPositions: clothGeo.mesh.positions,
  restNormals: clothGeo.mesh.normals,
  sParam: clothGeo.sParam,
  weights: computeClothWeights(clothGeo.sParam),
};

// 拖动中的瞬时姿态覆盖(非响应式,渲染循环读取)
export const dragOverride = { boneId: null, rot: null, pos: null };

// —— 选择 ——
export const selectBone = (id) => setState('ui', { selectedBone: id, selectedPart: null });
export const selectPart = (id) => setState('ui', { selectedPart: id, selectedBone: null });

// —— 骨架编辑 ——
export function reparentBone(boneId, newParentId) {
  if (boneId === newParentId) return;
  // 防环:新父不能是自己的子孙
  let cur = newParentId;
  while (cur) {
    if (cur === boneId) return;
    cur = state.bones[cur].parentId;
  }
  setState('bones', boneId, 'parentId', newParentId);
  persist();
}

export function setBoneRest(boneId, field, value) {
  setState('bones', boneId, field, [...value]);
  persist();
}

export function setBoneLimit(boneId, axis, idx, value) {
  setState('bones', boneId, 'limits', axis, idx, value);
  persist();
}

// —— 部件 ——
export function setPartBone(partId, boneId) {
  setState('parts', partId, 'boneId', boneId || null);
  persist();
}
export function setPartOffset(partId, field, value) {
  setState('parts', partId, field, [...value]);
  persist();
}
export function addImportedPart(name, meshKey, meshSrc) {
  const id = uid('part');
  setState('parts', id, {
    id, name, kind: 'custom', boneId: 'root', mesh: meshKey, meshSrc,
    offsetPos: [0, 0, 0], offsetRot: [0, 0, 0], visible: true,
  });
  setState('partOrder', (o) => [...o, id]);
  persist();
  return id;
}
export function removePart(partId) {
  const { [partId]: _drop, ...rest } = state.parts;
  setState('parts', rest);
  setState('partOrder', (o) => o.filter((x) => x !== partId));
  if (state.ui.selectedPart === partId) setState('ui', 'selectedPart', null);
  persist();
}

// Solid store 代理不支持直接改深层字段:轨道修改一律走「深拷贝 -> 变更 -> 整体替换」
export function updateTracks(fn) {
  const tracks = JSON.parse(JSON.stringify(state.anim.tracks));
  fn(tracks);
  setState('anim', 'tracks', tracks);
  persist();
}

// —— 姿态与关键帧 ——
export function currentPose() {
  if (state.ui.mode === 'rest') {
    const pose = {};
    for (const id of state.boneOrder) pose[id] = { pos: [...state.bones[id].pos], rot: [...state.bones[id].rot] };
    return pose;
  }
  const pose = evalPose(state.anim, state.bones, state.boneOrder, state.ui.frame);
  if (dragOverride.boneId && pose[dragOverride.boneId]) {
    if (dragOverride.rot) pose[dragOverride.boneId].rot = [...dragOverride.rot];
    if (dragOverride.pos) pose[dragOverride.boneId].pos = [...dragOverride.pos];
  }
  return pose;
}

export function keyBone(boneId, kinds = ['rot']) {
  const pose = currentPose();
  const p = pose[boneId];
  updateTracks((tracks) => {
    const anim = { tracks };
    for (const kind of kinds) {
      const keys = ensureTrack(anim, boneId, kind);
      upsertKey(keys, state.ui.frame, kind === 'rot' ? p.rot : p.pos);
      sortKeys(keys);
    }
  });
}

// 拖动结束:把覆盖姿态落成关键帧
export function commitDrag(boneId) {
  if (!dragOverride.rot && !dragOverride.pos) return;
  const rot = dragOverride.rot ? [...dragOverride.rot] : null;
  const pos = dragOverride.pos ? [...dragOverride.pos] : null;
  dragOverride.boneId = null; dragOverride.rot = null; dragOverride.pos = null;
  if (state.ui.mode === 'rest') {
    if (rot) setBoneRest(boneId, 'rot', rot);
    if (pos) setBoneRest(boneId, 'pos', pos);
    return;
  }
  updateTracks((tracks) => {
    const anim = { tracks };
    if (rot) {
      const keys = ensureTrack(anim, boneId, 'rot');
      upsertKey(keys, state.ui.frame, rot);
      sortKeys(keys);
    }
    if (pos) {
      const keys = ensureTrack(anim, boneId, 'pos');
      upsertKey(keys, state.ui.frame, pos);
      sortKeys(keys);
    }
  });
}

// —— 时间轴关键帧操作 ——
export function moveKey(boneId, kind, fromF, toF) {
  toF = Math.max(0, Math.min(state.anim.frames, Math.round(toF)));
  updateTracks((tracks) => {
    const keys = tracks[boneId]?.[kind];
    if (!keys) return;
    const k = keys.find((x) => Math.abs(x.f - fromF) < 1e-4);
    if (!k) return;
    if (keys.some((x) => x !== k && Math.abs(x.f - toF) < 1e-4)) return;
    k.f = toF;
    keys.sort((a, b) => a.f - b.f);
  });
}

export function deleteSelectedKeys() {
  const sel = state.ui.timelineSel;
  if (!sel.length) return;
  updateTracks((tracks) => {
    for (const s of sel) {
      const keys = tracks[s.boneId]?.[s.kind];
      if (keys) tracks[s.boneId][s.kind] = keys.filter((k) => Math.abs(k.f - s.f) > 1e-4);
    }
  });
  setState('ui', 'timelineSel', []);
}

export function copySelectedKeys() {
  const sel = state.ui.timelineSel;
  if (!sel.length) return;
  const items = [];
  for (const s of sel) {
    const k = state.anim.tracks[s.boneId]?.[s.kind]?.find((x) => Math.abs(x.f - s.f) < 1e-4);
    if (k) items.push({ boneId: s.boneId, kind: s.kind, key: JSON.parse(JSON.stringify(k)) });
  }
  if (!items.length) return;
  const f0 = Math.min(...items.map((i) => i.key.f));
  setState('ui', 'keyClipboard', items.map((i) => ({ ...i, rel: i.key.f - f0 })));
}

export function pasteKeys() {
  const clip = state.ui.keyClipboard;
  if (!clip || !clip.length) return;
  const at = state.ui.frame;
  updateTracks((tracks) => {
    const anim = { tracks };
    for (const item of clip) {
      const keys = ensureTrack(anim, item.boneId, item.kind);
      const f = Math.min(state.anim.frames, at + item.rel);
      const nk = { ...JSON.parse(JSON.stringify(item.key)), f };
      const i = keys.findIndex((x) => Math.abs(x.f - f) < 1e-4);
      if (i >= 0) keys[i] = nk; else keys.push(nk);
      sortKeys(keys);
    }
  });
}

export function mirrorAnim() {
  const pair = mirrorPair(state.bones, state.boneOrder);
  const animCopy = JSON.parse(JSON.stringify(state.anim));
  mirrorAnimation(animCopy, pair);
  setState('anim', 'tracks', animCopy.tracks);
  persist();
}

export function setKeyMode(boneId, kind, f, mode) {
  updateTracks((tracks) => {
    const k = tracks[boneId]?.[kind]?.find((x) => Math.abs(x.f - f) < 1e-4);
    if (k) k.mode = mode;
  });
}

export function setKeyHandle(boneId, kind, f, which, df, dv, comp) {
  updateTracks((tracks) => {
    const k = tracks[boneId]?.[kind]?.find((x) => Math.abs(x.f - f) < 1e-4);
    if (!k) return;
    k[which].df = df;
    k[which].dv = k[which].dv.map((x, i) => (i === comp ? dv : x));
  });
}

// —— 动画参数 ——
export function setAnimProp(prop, v) {
  setState('anim', prop, v);
  if (prop === 'frames') setState('anim', 'loop', ([a, b]) => [Math.min(a, v), Math.min(b, v)]);
  persist();
}

// —— 动作库 ——
export function saveToLibrary(name) {
  const anim = JSON.parse(JSON.stringify(state.anim));
  anim.name = name || anim.name;
  const entry = {
    id: uid('lib'),
    name: anim.name,
    anim,
    frames: anim.frames,
    fps: anim.fps,
    duration: +(anim.frames / anim.fps).toFixed(2),
    status: 'draft', // draft | qc | released | returned
    savedAt: new Date().toISOString(),
  };
  setState('library', (l) => [...l, entry]);
  saveLibrary(state.library);
  return entry.id;
}

export function loadLibraryEntry(id) {
  const e = state.library.find((x) => x.id === id);
  if (!e) return;
  setState('anim', JSON.parse(JSON.stringify(e.anim)));
  setState('ui', { frame: 0, tab: 'editor', timelineSel: [] });
  persist();
}

export function deleteLibraryEntry(id) {
  setState('library', (l) => l.filter((x) => x.id !== id));
  saveLibrary(state.library);
}

// —— 质检 ——
export function sendToQc(ids) {
  const batch = state.library
    .filter((e) => ids.includes(e.id))
    .map((e) => ({ libId: e.id, name: e.name, anim: JSON.parse(JSON.stringify(e.anim)) }));
  setState('qc', { batch, issues: [], ran: false, finished: null });
  setState('library', (l) => l.map((e) => (ids.includes(e.id) ? { ...e, status: 'qc' } : e)));
  saveLibrary(state.library);
  setState('ui', 'tab', 'qc');
}

export function runQc() {
  const all = [];
  for (const item of state.qc.batch) {
    const anim = { ...item.anim, id: item.libId, name: item.name };
    all.push(...runChecks(anim, state.bones, state.boneOrder, cloth));
  }
  setState('qc', { issues: all, ran: true, finished: null });
}

export function reviewIssue(issueId, verdict, note) {
  setState('qc', 'issues', (arr) =>
    arr.map((i) => (i.id === issueId ? { ...i, review: verdict, note: note ?? i.note } : i)));
}

export function qcSummary() {
  const issues = state.qc.issues;
  const errors = issues.filter((i) => i.severity === 'error');
  const pendingErrors = errors.filter((i) => i.review === 'pending');
  const confirmedErrors = errors.filter((i) => i.review === 'confirmed');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return {
    total: issues.length,
    errors: errors.length,
    warnings: warnings.length,
    pendingErrors: pendingErrors.length,
    confirmedErrors: confirmedErrors.length,
    canRelease: state.qc.ran && pendingErrors.length === 0 && confirmedErrors.length === 0,
    needsReturn: confirmedErrors.length > 0,
  };
}

export function releaseBatch() {
  const ids = state.qc.batch.map((b) => b.libId);
  setState('library', (l) => l.map((e) => (ids.includes(e.id) ? { ...e, status: 'released' } : e)));
  saveLibrary(state.library);
  setState('qc', 'finished', 'released');
}

export function returnBatch() {
  const ids = state.qc.batch.map((b) => b.libId);
  setState('library', (l) => l.map((e) => (ids.includes(e.id) ? { ...e, status: 'returned' } : e)));
  saveLibrary(state.library);
  setState('qc', 'finished', 'returned');
}

// —— 持久化 ——
let persistTimer = null;
export function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    saveProject({
      ui: { ...state.ui, playing: false, timelineSel: [], keyClipboard: null },
      bones: state.bones,
      boneOrder: state.boneOrder,
      parts: state.parts,
      partOrder: state.partOrder,
      anim: state.anim,
      qc: { batch: [], issues: [], ran: false, finished: null },
    });
  }, 400);
}

export function newAnimation() {
  setState('anim', emptyAnim());
  setState('ui', { frame: 0, timelineSel: [] });
  persist();
}

export { evalTrack };
