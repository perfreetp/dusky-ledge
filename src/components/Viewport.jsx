// 三维视口:渲染循环、旋转手柄、骨骼拾取、相机
import { onMount, onCleanup } from 'solid-js';
import { createRenderer } from '../core/renderer.js';
import { buildHeadMesh, buildLimbMesh, buildTailMesh, makeTorus, makeSphere, parseOBJ } from '../core/mesh.js';
import { computeFK } from '../core/skeleton.js';
import { evalPose } from '../core/animation.js';
import { computeBindMatrices, skinCloth } from '../core/skinning.js';
import {
  V3, mat4FromTRS, mat4Multiply, mat4Translation, mat3FromMat4, mat3Multiply,
  mat3Transpose, mat3AxisAngle, eulerFromMat3, rayPlane, distPointRay, mat4TransformPoint,
} from '../core/math.js';
import { state, setState, currentPose, commitDrag, selectBone, cloth, dragOverride } from '../state/store.js';

const AXIS_COLORS = [[0.85, 0.25, 0.25], [0.35, 0.8, 0.3], [0.3, 0.5, 0.95]];
const AXIS_HOT = [1, 0.85, 0.2];

// 供导出等外部调用
export const viewportApi = { renderAt: null, canvas: null };

export default function Viewport() {
  let canvas;
  let renderer;
  let raf = 0;
  let lastT = 0;

  const meshes = {};
  const objCache = new Map(); // meshSrc -> mesh
  let torus, jointSphere;
  let invBind = null;
  let gridVerts = [];

  // 交互状态
  const drag = {
    mode: null, // 'axis' | 'orbit' | 'pan' | null
    axis: -1,
    startX: 0, startY: 0,
    yaw0: 0, pitch0: 0, target0: null,
    // 旋转拖动
    boneId: null, center: null, axisVec: null, u: null, v: null,
    angle0: 0, worldRot0: null, parentInvRot: null, restRot0: null,
  };
  let hoverAxis = -1;

  function resolveMesh(part) {
    const key = part.mesh;
    if (key === 'builtin:head') return meshes.head;
    if (key === 'builtin:limb') return meshes.limb;
    if (key === 'builtin:tail') return meshes.tail;
    if (key === 'builtin:cloth') return cloth.mesh;
    if (part.meshSrc) {
      if (!objCache.has(part.meshSrc)) objCache.set(part.meshSrc, parseOBJ(part.meshSrc));
      return objCache.get(part.meshSrc);
    }
    return null;
  }

  const PART_COLORS = {
    head: [0.78, 0.16, 0.18],
    limb: [0.85, 0.62, 0.15],
    tail: [0.9, 0.45, 0.12],
    cloth: [0.72, 0.12, 0.22],
    custom: [0.5, 0.55, 0.65],
  };

  function buildGrid() {
    const v = [];
    const N = 10, S = 0.5;
    for (let i = -N; i <= N; i++) {
      v.push(i * S, 0, -N * S, i * S, 0, N * S);
      v.push(-N * S, 0, i * S, N * S, 0, i * S);
    }
    return v;
  }

  function renderScene(forFrame = null) {
    const p = forFrame === null
      ? currentPose()
      : evalPose(state.anim, state.bones, state.boneOrder, forFrame);
    const world = computeFK(state.bones, state.boneOrder, p);
    if (!invBind) invBind = computeBindMatrices(state.bones, state.boneOrder, computeFK(state.bones, state.boneOrder, null));

    renderer.begin();

    // 地面
    if (state.ui.showGrid) renderer.drawLines(gridVerts, [0.3, 0.32, 0.36], 0.6);

    // 部件
    for (const pid of state.partOrder) {
      const part = state.parts[pid];
      if (!part.visible) continue;
      const mesh = resolveMesh(part);
      if (!mesh) continue;
      const color = PART_COLORS[part.kind] || PART_COLORS.custom;
      if (part.kind === 'cloth') {
        const skinned = skinCloth(cloth.restPositions, cloth.restNormals, cloth.weights, world, invBind);
        cloth.mesh.positions.set(skinned.positions);
        cloth.mesh.normals.set(skinned.normals);
        cloth.mesh._dirty = true;
        renderer.drawMesh(cloth.mesh, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], color, { cull: false, dynamic: true, alpha: 0.96 });
      } else {
        const boneM = part.boneId ? world[part.boneId] : [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
        const off = mat4FromTRS(part.offsetPos, part.offsetRot);
        const model = mat4Multiply(boneM, off);
        const selected = state.ui.selectedPart === pid;
        renderer.drawMesh(mesh, model, selected ? [1, 0.7, 0.2] : color, {});
      }
    }

    // 骨骼线
    if (state.ui.showBones) {
      const verts = [];
      const joints = {};
      for (const id of state.boneOrder) joints[id] = mat4TransformPoint(world[id], [0, 0, 0]);
      for (const id of state.boneOrder) {
        const b = state.bones[id];
        if (b.parentId) {
          const a = joints[b.parentId], c = joints[id];
          verts.push(...a, ...c);
        }
      }
      renderer.drawLines(verts, [0.55, 0.75, 0.95], 0.9);
      // 关节点
      for (const id of state.boneOrder) {
        const sel = state.ui.selectedBone === id;
        const m = mat4Translation(joints[id]);
        renderer.drawMesh(jointSphere, m, sel ? [1, 0.8, 0.15] : [0.5, 0.7, 0.95],
          { unlit: true });
      }
    }

    // 旋转手柄
    const selBone = state.ui.selectedBone;
    if (selBone && world[selBone]) {
      const center = mat4TransformPoint(world[selBone], [0, 0, 0]);
      const eye = renderer.camera.eye();
      const scale = V3.dist(eye, center) * 0.16;
      for (let a = 0; a < 3; a++) {
        // 圆环默认法线为 Y,旋转到对应轴
        const rot = a === 0 ? [0, 0, -90] : a === 1 ? [0, 0, 0] : [90, 0, 0];
        const orientM = mat4FromTRS([0, 0, 0], rot);
        const boneRot = world[selBone];
        const model = mat4Multiply(
          mat4Translation(center),
          mat4Multiply(
            [boneRot[0], boneRot[1], boneRot[2], 0, boneRot[4], boneRot[5], boneRot[6], 0, boneRot[8], boneRot[9], boneRot[10], 0, 0, 0, 0, 1],
            mat4Multiply(orientM, [scale,0,0,0, 0,scale,0,0, 0,0,scale,0, 0,0,0,1])
          )
        );
        const hot = drag.mode === 'axis' && drag.axis === a;
        const hov = hoverAxis === a;
        renderer.drawMesh(torus, model, hot || hov ? AXIS_HOT : AXIS_COLORS[a], { unlit: true, cull: false });
      }
    }
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - lastT) / 1000 || 0);
    lastT = t;
    // 播放
    if (state.ui.playing) {
      const [ls, le] = state.anim.loop;
      let f = state.ui.frame + state.anim.fps * dt;
      if (f > le) f = ls + (f - le) % Math.max(1, le - ls);
      setState('ui', 'frame', Math.min(le, f));
    }
    renderScene();
  }

  // —— 拾取 ——
  function gizmoHit(px, py) {
    const selBone = state.ui.selectedBone;
    if (!selBone) return -1;
    const pose = currentPose();
    const world = computeFK(state.bones, state.boneOrder, pose);
    const center = mat4TransformPoint(world[selBone], [0, 0, 0]);
    const eye = renderer.camera.eye();
    const R = V3.dist(eye, center) * 0.16;
    const { ro, rd } = renderer.pickRay(px, py);
    let best = -1, bestT = Infinity;
    for (let a = 0; a < 3; a++) {
      const m = world[selBone];
      const axis = V3.norm([m[a * 4], m[a * 4 + 1], m[a * 4 + 2]]);
      const t = rayPlane(ro, rd, center, axis);
      if (t === null) continue;
      const p = V3.add(ro, V3.scale(rd, t));
      const d = Math.abs(V3.dist(p, center) - R);
      if (d < R * 0.22 && t < bestT) { best = a; bestT = t; }
    }
    return best;
  }

  function boneHit(px, py) {
    const pose = currentPose();
    const world = computeFK(state.bones, state.boneOrder, pose);
    const { ro, rd } = renderer.pickRay(px, py);
    let best = null, bestD = 0.14;
    for (const id of state.boneOrder) {
      const j = mat4TransformPoint(world[id], [0, 0, 0]);
      const { d } = distPointRay(j, ro, rd);
      if (d < bestD) { best = id; bestD = d; }
    }
    return best;
  }

  function planeAngle(px, py) {
    const { ro, rd } = renderer.pickRay(px, py);
    const t = rayPlane(ro, rd, drag.center, drag.axisVec);
    if (t === null) return null;
    const p = V3.sub(V3.add(ro, V3.scale(rd, t)), drag.center);
    return Math.atan2(V3.dot(p, drag.v), V3.dot(p, drag.u));
  }

  function onPointerDown(e) {
    canvas.setPointerCapture(e.pointerId);
    drag.startX = e.clientX; drag.startY = e.clientY;
    if (e.button === 2) {
      drag.mode = 'pan';
      drag.target0 = [...renderer.camera.target];
      return;
    }
    if (e.button !== 0) return;
    // 1) 手柄
    const axis = gizmoHit(e.clientX, e.clientY);
    if (axis >= 0) {
      const boneId = state.ui.selectedBone;
      const pose = currentPose();
      const world = computeFK(state.bones, state.boneOrder, pose);
      const m = world[boneId];
      const center = mat4TransformPoint(m, [0, 0, 0]);
      const axisVec = V3.norm([m[axis * 4], m[axis * 4 + 1], m[axis * 4 + 2]]);
      // 平面基
      const ref = Math.abs(axisVec[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = V3.norm(V3.cross(axisVec, ref));
      const v = V3.cross(axisVec, u);
      drag.mode = 'axis';
      drag.axis = axis;
      drag.boneId = boneId;
      drag.center = center;
      drag.axisVec = axisVec;
      drag.u = u; drag.v = v;
      drag.worldRot0 = mat3FromMat4(m);
      const b = state.bones[boneId];
      drag.parentInvRot = b.parentId
        ? mat3Transpose(mat3FromMat4(world[b.parentId]))
        : [1, 0, 0, 0, 1, 0, 0, 0, 1];
      drag.restRot0 = state.ui.mode === 'rest' ? [...b.rot] : null;
      dragOverride.boneId = boneId;
      dragOverride.rot = [...pose[boneId].rot];
      drag.angle0 = planeAngle(e.clientX, e.clientY) ?? 0;
      return;
    }
    // 2) 骨骼拾取
    const bone = boneHit(e.clientX, e.clientY);
    if (bone) {
      selectBone(bone);
      setState('ui', 'curve', { ...state.ui.curve, boneId: bone });
      drag.mode = null;
      return;
    }
    // 3) 相机
    drag.mode = 'orbit';
    drag.yaw0 = renderer.camera.yaw;
    drag.pitch0 = renderer.camera.pitch;
  }

  function onPointerMove(e) {
    if (drag.mode === 'axis') {
      const ang = planeAngle(e.clientX, e.clientY);
      if (ang === null) return;
      let delta = ang - drag.angle0;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      const deg = (delta * 180) / Math.PI;
      const rotDelta = mat3AxisAngle(drag.axisVec, deg);
      const newWorld = mat3Multiply(rotDelta, drag.worldRot0);
      const local = mat3Multiply(drag.parentInvRot, newWorld);
      let euler = eulerFromMat3(local);
      if (state.ui.enforceLimits) {
        const lim = state.bones[drag.boneId].limits;
        const axes = ['x', 'y', 'z'];
        euler = euler.map((v, i) => {
          const [mn, mx] = lim[axes[i]] || [-180, 180];
          return Math.max(mn, Math.min(mx, v));
        });
      }
      dragOverride.rot = euler;
      return;
    }
    if (drag.mode === 'orbit') {
      renderer.camera.yaw = drag.yaw0 + (e.clientX - drag.startX) * 0.4;
      renderer.camera.pitch = Math.max(-85, Math.min(85, drag.pitch0 + (e.clientY - drag.startY) * 0.3));
      return;
    }
    if (drag.mode === 'pan') {
      const k = renderer.camera.dist * 0.0016;
      const yaw = (renderer.camera.yaw * Math.PI) / 180;
      const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
      const dx = (e.clientX - drag.startX) * k;
      const dy = (e.clientY - drag.startY) * k;
      renderer.camera.target = [
        drag.target0[0] - right[0] * dx,
        drag.target0[1] + dy,
        drag.target0[2] - right[2] * dx,
      ];
      return;
    }
    // 悬停高亮
    hoverAxis = gizmoHit(e.clientX, e.clientY);
    canvas.style.cursor = hoverAxis >= 0 ? 'grab' : 'default';
  }

  function onPointerUp() {
    if (drag.mode === 'axis') {
      commitDrag(drag.boneId);
    }
    drag.mode = null;
    drag.axis = -1;
  }

  function onWheel(e) {
    e.preventDefault();
    renderer.camera.dist = Math.max(1.5, Math.min(30, renderer.camera.dist * (1 + Math.sign(e.deltaY) * 0.1)));
  }

  onMount(() => {
    renderer = createRenderer(canvas);
    meshes.head = buildHeadMesh();
    meshes.limb = buildLimbMesh();
    meshes.tail = buildTailMesh();
    torus = makeTorus(1, 0.035, 56, 8);
    jointSphere = makeSphere(0.045, 10, 8);
    gridVerts = buildGrid();
    viewportApi.renderAt = (f) => renderScene(f);
    viewportApi.canvas = canvas;
    window.__vp = viewportApi; // 测试钩子
    // 测试/调试钩子:骨骼关节与手柄环的屏幕坐标
    viewportApi.gizmoScreen = (id) => {
      const pose = currentPose();
      const world = computeFK(state.bones, state.boneOrder, pose);
      if (!world[id]) return null;
      const center = mat4TransformPoint(world[id], [0, 0, 0]);
      const eye = renderer.camera.eye();
      const R = V3.dist(eye, center) * 0.16;
      const proj = (p) => {
        const vp = renderer.camera.viewProj(canvas.width / canvas.height);
        const clip = [
          vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12],
          vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13],
          vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15],
        ];
        const rect = canvas.getBoundingClientRect();
        return {
          x: rect.left + ((clip[0] / clip[2] + 1) / 2) * rect.width,
          y: rect.top + ((1 - clip[1] / clip[2]) / 2) * rect.height,
        };
      };
      const c = proj(center);
      const px = proj(V3.add(center, [R, 0, 0]));
      return { cx: c.x, cy: c.y, r: Math.abs(px.x - c.x) };
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    raf = requestAnimationFrame(frame);
  });

  onCleanup(() => {
    cancelAnimationFrame(raf);
    viewportApi.renderAt = null;
  });

  return (
    <div class="viewport-wrap">
      <canvas ref={canvas} class="viewport" />
      <div class="viewport-hud">
        <span>{state.ui.mode === 'rest' ? '静止姿态编辑' : `动画编辑 · 第 ${Math.floor(state.ui.frame)} 帧`}</span>
        <span class="hud-dim">左键拖环旋转 · 点选骨骼 · 空白拖动转视角 · 右键平移 · 滚轮缩放</span>
      </div>
    </div>
  );
}
