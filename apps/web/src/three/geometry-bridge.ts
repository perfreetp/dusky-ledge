import * as THREE from 'three';
import type { TubeMesh } from '@pg/geom-kernel';
import type { CurvatureCombResult } from '@pg/geom-kernel';

/** geom-kernel 的 Float64 管 mesh 转 three BufferGeometry */
export function tubeToThreeGeometry(mesh: TubeMesh, violationT: Set<number>): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(mesh.positions), 3));
  geo.setIndex(Array.from(mesh.indices));

  // 顶点色：超曲率/越界区段标红，其余按层默认色
  const cols = mesh.radialSegments + 1;
  const colors = new Float32Array(mesh.positions.length);
  const red = new THREE.Color(0xd40000);
  const normal = new THREE.Color(mesh.layer === 'outer' ? 0x409eff : 0x90caf9);
  const rows = mesh.tubularSegments + 1;
  for (let i = 0; i < rows; i++) {
    const t = mesh.vertexT[i * cols]!;
    const c = violationT.has(roundT(t)) ? red : normal;
    for (let j = 0; j < cols; j++) {
      const idx = (i * cols + j) * 3;
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function roundT(t: number): number {
  return Math.round(t * 1000) / 1000;
}

/** 曲率梳 → three LineSegments（正常绿、超差红） */
export function combToLineSegments(
  comb: CurvatureCombResult,
): { teeth: THREE.LineSegments; spine: THREE.Line } {
  const positions: number[] = [];
  const colors: number[] = [];
  comb.teeth.forEach((tooth, i) => {
    positions.push(...tooth.base, ...tooth.tip);
    const bad = comb.violationFlags[i]!;
    const c = bad ? [0.83, 0, 0] : [0.18, 0.76, 0.2];
    colors.push(...c, ...c);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false });
  mat.transparent = true;
  mat.opacity = 0.9;
  const teeth = new THREE.LineSegments(geo, mat);
  teeth.renderOrder = 9;

  const spineGeo = new THREE.BufferGeometry();
  spineGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(comb.spine.flatMap((p) => [...p]), 3),
  );
  const spine = new THREE.Line(
    spineGeo,
    new THREE.LineBasicMaterial({ color: 0x2e7d32, depthTest: false }),
  );
  spine.renderOrder = 9;
  return { teeth, spine };
}

/** 样条中心线 */
export function centerlineToLine(points: [number, number, number][]): THREE.Line {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((p) => [...p]), 3));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x303133, linewidth: 2 }));
}
