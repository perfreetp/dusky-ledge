import * as THREE from 'three';
import type { ControlPoint, InspectionResult, InterpolationType, ProjectRules } from '@pg/shared';
import {
  evaluateSpline,
  analyzeCurvature,
  buildTube,
  checkLayerGap,
  runPipeline,
  type JointEnvelope,
  type PipelineOutput,
} from '@pg/geom-kernel';
import { GizmoController } from './gizmo.js';
import { centerlineToLine, combToLineSegments, tubeToThreeGeometry } from './geometry-bridge.js';

export interface SceneControllerOptions {
  showInner: boolean;
  showOuter: boolean;
  showComb: boolean;
}

/** 场景总控：模型状态 → geom-kernel → three 对象 */
export class SceneController {
  private modelGroup = new THREE.Group();
  private gizmo: GizmoController;
  private lastOutput: PipelineOutput | null = null;

  constructor(
    private scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
  ) {
    this.scene.add(this.modelGroup);
    this.gizmo = new GizmoController(camera, canvas);
  }

  get controller(): GizmoController {
    return this.gizmo;
  }

  get output(): PipelineOutput | null {
    return this.lastOutput;
  }

  /** 全量重建（控制点/插值/规则变化时调用，内部可加防抖） */
  rebuild(
    controlPoints: ControlPoint[],
    interpolation: InterpolationType,
    rules: ProjectRules,
    projectCode: string,
    envelopes: JointEnvelope[] | undefined,
    options: SceneControllerOptions,
  ): PipelineOutput | null {
    this.clearModel();
    this.gizmo.sync(controlPoints);
    if (controlPoints.length < 2) return null;

    const out = runPipeline({
      controlPoints,
      interpolation,
      rules,
      projectCode,
      envelopes,
    });
    this.lastOutput = out;

    // 中心线
    const center = centerlineToLine(
      out.evaluation.samples.map((s) => [...s.position] as [number, number, number]),
    );
    this.modelGroup.add(center);

    // 超差 t 集合（曲率 + 包络）
    const badT = new Set<number>();
    for (const v of out.curvature.violations) {
      for (let i = 0; i < out.evaluation.samples.length; i++) {
        const t = out.evaluation.samples[i]!.t;
        if (t >= v.tStart && t <= v.tEnd) badT.add(Math.round(t * 1000) / 1000);
      }
    }
    if (out.envelope) {
      out.envelope.violations.forEach((v) => {
        for (const smp of out.evaluation.samples) {
          if (smp.t >= v.tStart && smp.t <= v.tEnd) badT.add(Math.round(smp.t * 1000) / 1000);
        }
      });
    }

    // 双层管面
    if (options.showOuter) {
      const geo = tubeToThreeGeometry(out.outerTube, badT);
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        roughness: 0.6,
      });
      this.modelGroup.add(new THREE.Mesh(geo, mat));
    }
    if (options.showInner) {
      const geo = tubeToThreeGeometry(out.innerTube, badT);
      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        roughness: 0.5,
      });
      this.modelGroup.add(new THREE.Mesh(geo, mat));
    }

    // 曲率梳
    if (options.showComb) {
      const { teeth, spine } = combToLineSegments(out.curvature);
      this.modelGroup.add(teeth, spine);
    }

    this.modelGroup.add(this.gizmo.group);
    return out;
  }

  /** 轻量预览：只更新中心线（拖拽过程中可选） */
  previewSpline(controlPoints: ControlPoint[], interpolation: InterpolationType): void {
    // 保留 gizmo，移除旧中心线（第一条 Line）
    const lines = this.modelGroup.children.filter((c) => c instanceof THREE.Line);
    lines.forEach((l) => {
      this.modelGroup.remove(l);
      (l as THREE.Line).geometry.dispose();
    });
    if (controlPoints.length < 2) return;
    const evalResult = evaluateSpline(interpolation, controlPoints, { samples: 120 });
    this.modelGroup.add(
      centerlineToLine(
        evalResult.samples.map((s) => [...s.position] as [number, number, number]),
      ),
    );
  }

  /** 供 UI 实时数字：不重建 three 对象的纯计算 */
  inspectOnly(
    controlPoints: ControlPoint[],
    interpolation: InterpolationType,
    rules: ProjectRules,
  ): InspectionResult {
    const evaluation = evaluateSpline(interpolation, controlPoints, {
      samples: rules.tubularSegments,
    });
    const minBendRadius = rules.bendRadiusFactor * rules.outerDiameter;
    const curvature = analyzeCurvature(evaluation, { minBendRadius });
    const outer = buildTube(evaluation, {
      radius: rules.outerDiameter / 2,
      radialSegments: rules.radialSegments,
      tubularSegments: rules.tubularSegments,
      layer: 'outer',
    });
    const inner = buildTube(evaluation, {
      radius: rules.outerDiameter / 2 - rules.wallThickness,
      radialSegments: rules.radialSegments,
      tubularSegments: rules.tubularSegments,
      layer: 'inner',
    });
    const gap = checkLayerGap(
      inner,
      outer,
      rules.minLayerGap,
      curvature.minBendRadius === Infinity ? Number.POSITIVE_INFINITY : curvature.minBendRadius,
    );
    return {
      totalLength: evaluation.totalLength,
      minBendRadius: curvature.minBendRadius,
      curvatureViolations: curvature.violations,
      envelopeViolations: [],
      minMeasuredGap: gap.minMeasuredGap,
      minGapPass: gap.pass,
      segmentStats: [],
      unfoldAreaErrorPct: null,
    };
  }

  private clearModel(): void {
    for (const child of [...this.modelGroup.children]) {
      if (child === this.gizmo.group) continue;
      this.modelGroup.remove(child);
      disposeObject(child);
    }
  }

  dispose(): void {
    this.clearModel();
    this.gizmo.dispose();
  }
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
}
