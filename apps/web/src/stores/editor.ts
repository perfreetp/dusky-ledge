import { defineStore } from 'pinia';
import type { ControlPoint, InterpolationType, ProjectRules, Vec3 } from '@pg/shared';
import {
  buildSplineModel,
  defaultRules,
  demoControlPoints,
  makeControlPoint,
  newId,
  type EditorState,
} from './model-factory.js';

export const useEditorStore = defineStore('editor', {
  state: (): EditorState => ({
    projectId: null,
    projectCode: 'LOCAL',
    modelName: '未命名护套',
    interpolation: 'catmullRom',
    controlPoints: demoControlPoints(),
    rules: defaultRules(),
    jointAngles: {},
    selectedId: null,
    showInner: true,
    showOuter: true,
    showComb: true,
    dirty: false,
  }),
  getters: {
    selected(state): ControlPoint | null {
      return state.controlPoints.find((p) => p.id === state.selectedId) ?? null;
    },
    model(state) {
      return buildSplineModel(state);
    },
  },
  actions: {
    loadModel(model: ReturnType<typeof buildSplineModel>, projectId: string, projectCode: string) {
      this.projectId = projectId;
      this.projectCode = projectCode;
      this.modelName = model.name;
      this.interpolation = model.interpolation;
      this.controlPoints = JSON.parse(JSON.stringify(model.controlPoints));
      this.rules = JSON.parse(JSON.stringify(model.rules));
      this.jointAngles = JSON.parse(JSON.stringify(model.jointAngles));
      this.selectedId = null;
      this.dirty = false;
    },
    setInterpolation(type: InterpolationType) {
      this.interpolation = type;
      this.dirty = true;
    },
    updateRules(patch: Partial<ProjectRules>) {
      this.rules = { ...this.rules, ...patch };
      this.dirty = true;
    },
    movePoint(id: string, position: Vec3) {
      const p = this.controlPoints.find((x) => x.id === id);
      if (p) {
        p.position = position;
        this.dirty = true;
      }
    },
    updatePoint(id: string, patch: Partial<ControlPoint>) {
      const p = this.controlPoints.find((x) => x.id === id);
      if (p) {
        Object.assign(p, patch);
        this.dirty = true;
      }
    },
    select(id: string | null) {
      this.selectedId = id;
    },
    addPointAfter(selectedId: string | null, position?: Vec3) {
      const idx = selectedId ? this.controlPoints.findIndex((p) => p.id === selectedId) : -1;
      const insertAt = idx >= 0 ? idx + 1 : this.controlPoints.length;
      const prev = this.controlPoints[Math.max(0, insertAt - 1)];
      const next = this.controlPoints[insertAt];
      const pos: Vec3 = position
        ? position
        : next && prev
          ? [
              (prev.position[0] + next.position[0]) / 2,
              (prev.position[1] + next.position[1]) / 2,
              (prev.position[2] + next.position[2]) / 2,
            ]
          : prev
            ? [prev.position[0] + 40, prev.position[1], prev.position[2]]
            : [0, 0, 0];
      const jointId = next?.jointId ?? prev?.jointId ?? 'J1';
      this.controlPoints.splice(insertAt, 0, makeControlPoint(pos, jointId));
      this.dirty = true;
    },
    removePoint(id: string) {
      if (this.controlPoints.length <= 2) return;
      this.controlPoints = this.controlPoints.filter((p) => p.id !== id);
      if (this.selectedId === id) this.selectedId = null;
      this.dirty = true;
    },
    setJointAngle(jointId: string, angleRad: number) {
      this.jointAngles[jointId] = angleRad;
      this.dirty = true;
    },
    markSaved() {
      this.dirty = false;
    },
    resetDemo() {
      this.controlPoints = demoControlPoints();
      this.interpolation = 'catmullRom';
      this.rules = defaultRules();
      this.selectedId = null;
      this.dirty = true;
    },
    genId() {
      return newId();
    },
  },
});
