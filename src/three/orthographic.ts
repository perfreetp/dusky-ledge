import * as THREE from 'three';
import { evaluated } from '../store/evaluated';
import { modelStore } from '../store/model';
import { ATTR_CAP, ATTR_FACE } from '../core/geometry';

// 第一角画法：俯视图在主视图下方，左视图在主视图右方
export type ViewKind = 'front' | 'top' | 'left';

export interface ViewDef {
  kind: ViewKind;
  title: string;
  dir: THREE.Vector3; // 视线方向（相机看向 -dir）
  up: THREE.Vector3;
}

export const VIEWS: ViewDef[] = [
  { kind: 'front', title: '主视图（前视）', dir: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
  { kind: 'top', title: '俯视图（上视）', dir: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
  { kind: 'left', title: '左视图（左视）', dir: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
];

interface ProjectedPoint {
  x: number; // 视图平面坐标（mm）
  y: number;
  depth: number;
}

interface ProjectedEdge {
  a: ProjectedPoint;
  b: ProjectedPoint;
  hidden: boolean;
}

interface ProjectedCap {
  poly: { x: number; y: number }[];
  depth: number;
}

interface ProjectedView {
  def: ViewDef;
  edges: ProjectedEdge[];
  caps: ProjectedCap[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function makeDepthTarget(size: number): { target: THREE.WebGLRenderTarget; depthTex: THREE.DepthTexture } {
  const depthTex = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
  depthTex.format = THREE.DepthFormat;
  depthTex.type = THREE.UnsignedIntType;
  depthTex.minFilter = THREE.NearestFilter;
  depthTex.magFilter = THREE.NearestFilter;
  const target = new THREE.WebGLRenderTarget(size, size, {
    depthTexture: depthTex,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  return { target, depthTex };
}

function buildBasis(dir: THREE.Vector3, up: THREE.Vector3): { u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3 } {
  const n = dir.clone().normalize(); // 相机朝 -n，深度沿 +n
  const u = new THREE.Vector3().crossVectors(up, n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  return { u, v, n };
}

/** 渲染单个正交视图：深度图 + 投影边 + 可见性判定 + 剖面多边形 */
function renderView(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  mesh: THREE.Mesh,
  def: ViewDef,
  depthSize: number,
): ProjectedView {
  const entry = evaluated();
  const geometry = entry.geometry;
  const { target, depthTex } = makeDepthTarget(depthSize);

  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = sphere.radius * 1.15;

  const camera = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, r * 8);
  const { u, v, n } = buildBasis(def.dir, def.up);
  camera.position.copy(center).addScaledVector(n, r * 4);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);

  const oldBg = scene.background;
  scene.background = new THREE.Color(0xffffff);
  const oldTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(oldTarget);
  scene.background = oldBg;

  const gl = renderer.getContext();
  const depthBuf = new Uint32Array(depthSize * depthSize);
  gl.readPixels(0, 0, depthSize, depthSize, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, depthBuf);

  const depthAt = (px: number, py: number): number => {
    const ix = Math.min(depthSize - 1, Math.max(0, px));
    const iy = Math.min(depthSize - 1, Math.max(0, py));
    return depthBuf[iy * depthSize + ix];
  };

  // 世界坐标 → 视图平面 + 裁剪空间（深度）
  const posAttr = geometry.attributes.position;
  const index = geometry.index!;
  const world = new THREE.Vector3();
  const clip = new THREE.Vector3();
  const projected: ProjectedPoint[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < posAttr.count; i++) {
    world.fromBufferAttribute(posAttr, i);
    clip.copy(world).applyMatrix4(camera.projectionMatrix).applyMatrix4(camera.matrixWorldInverse);
    const rel = world.clone().sub(center);
    const x = rel.dot(u);
    const y = rel.dot(v);
    const depth = rel.dot(n);
    projected.push({ x, y, depth });
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // 深度像素阈值（24 位深度缓冲，3 个像素余量）
  const near = camera.near;
  const far = camera.far;
  const samplePx = (p: ProjectedPoint): { px: number; py: number; depth: number } => {
    const ndcX = p.x / r;
    const ndcY = p.y / r;
    return {
      px: Math.round(((ndcX + 1) / 2) * (depthSize - 1)),
      py: Math.round(((ndcY + 1) / 2) * (depthSize - 1)),
      depth: p.depth,
    };
  };
  const depthTolerance = ((3 * (far - near)) / depthSize) * (1 << 24);

  const edgeVisible = (p: ProjectedPoint): boolean => {
    const s = samplePx(p);
    const stored = depthAt(s.px, s.py);
    // n 是视线方向（相机朝 -n），点越靠后 depth 越大，viewZ 越负。
    // 正交投影窗口深度：depth_window = (viewZ - near) / (far - near)
    const viewZ = -(near + p.depth);
    const d = ((viewZ - near) / (far - near)) * 0xffffffff;
    return stored + depthTolerance >= d;
  };

  // 工程视图线稿提取（两阶段）：
  // 阶段一（3D 语义过滤）：边两侧三角面的 aFace 相同 → 同一语义面内部，
  //   直接剔除（圆柱/棱台侧面剖分边、平面三角化边都被过滤）；
  //   aFace 不同或无邻接（接缝/边界）→ 候选棱线。
  // 阶段二（2D 共线合并）：候选边投影到视图平面，方向/位置量化聚类，
  //   CSG 的 T 型接缝碎段在 2D 自动合并为完整直线，再按深度判可见/隐藏。
  const faceAttr3D = geometry.getAttribute(ATTR_FACE);
  const capAttr3D = geometry.getAttribute(ATTR_CAP);
  const faceOfVertex = (vi: number): number => {
    if (!faceAttr3D) return 0;
    return Math.round(faceAttr3D.getX(vi));
  };
  const isCapVertex = (vi: number): boolean => (capAttr3D ? capAttr3D.getX(vi) > 0.5 : false);

  // 顶点按 0.05mm 容差聚类，解决 CSG 输出不共享索引的问题
  const WELD_EPS = 0.05;
  const clusterId: number[] = new Array(posAttr.count);
  const clusterPos: THREE.Vector3[] = [];
  const clusterFace = new Map<number, Set<number>>();
  const vGrid = new Map<string, number[]>();
  const tmpV = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    tmpV.fromBufferAttribute(posAttr, i);
    const cx = Math.floor(tmpV.x / WELD_EPS);
    const cy = Math.floor(tmpV.y / WELD_EPS);
    const cz = Math.floor(tmpV.z / WELD_EPS);
    let found = -1;
    for (let dx = -1; dx <= 1 && found < 0; dx++) {
      for (let dy = -1; dy <= 1 && found < 0; dy++) {
        for (let dz = -1; dz <= 1 && found < 0; dz++) {
          const bucket = vGrid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!bucket) continue;
          for (const id of bucket) {
            if (clusterPos[id].distanceToSquared(tmpV) <= WELD_EPS * WELD_EPS) {
              found = id;
              break;
            }
          }
        }
      }
    }
    if (found < 0) {
      found = clusterPos.length;
      clusterPos.push(tmpV.clone());
      const key = `${cx},${cy},${cz}`;
      const bucket = vGrid.get(key) ?? [];
      bucket.push(found);
      vGrid.set(key, bucket);
      clusterFace.set(found, new Set());
    }
    clusterId[i] = found;
    clusterFace.get(found)!.add(faceOfVertex(i));
  }

  // 候选边：聚类编号去重，同时收集每条边两侧的三角面法线。
  // CSG 插值会污染 aFace，所以语义面之外再加几何判定兜底：
  // 邻接三角面法线夹角 <5° 视为同一光滑面/共面内部边，直接剔除。
  interface CandEdge {
    a: number;
    b: number;
    normals: THREE.Vector3[];
  }
  const triNormals: THREE.Vector3[] = [];
  {
    const ea = new THREE.Vector3();
    const eb = new THREE.Vector3();
    const ec = new THREE.Vector3();
    for (let t = 0; t < index.count; t += 3) {
      ea.fromBufferAttribute(posAttr, index.getX(t));
      eb.fromBufferAttribute(posAttr, index.getX(t + 1));
      ec.fromBufferAttribute(posAttr, index.getX(t + 2));
      triNormals.push(
        new THREE.Vector3().subVectors(eb, ea).cross(new THREE.Vector3().subVectors(ec, ea)).normalize(),
      );
    }
  }
  const edgeKeySet = new Set<string>();
  const candidateMap = new Map<string, CandEdge>();
  // 15°：覆盖 48 分段圆柱的 7.5° 面片夹角与棱台侧面，真实棱线通常 ≥30°
  const SMOOTH_COS = Math.cos((15 * Math.PI) / 180);
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    const triFace = faceOfVertex(tri[0]);
    const triCap = isCapVertex(tri[0]);
    const tn = triNormals[t / 3];
    for (let e = 0; e < 3; e++) {
      const va = clusterId[tri[e]];
      const vb = clusterId[tri[(e + 1) % 3]];
      if (va === vb) continue;
      const key = va < vb ? `${va}|${vb}` : `${vb}|${va}`;
      let edge = candidateMap.get(key);
      if (!edge) {
        edge = { a: Math.min(va, vb), b: Math.max(va, vb), normals: [] };
        candidateMap.set(key, edge);
        edgeKeySet.add(key);
      }
      if (!edge.normals.some((m) => m.dot(tn) > 0.9999)) edge.normals.push(tn);

      // 语义面判定（快速路径）：整条边两端都只属于同一 aFace
      const facesA = clusterFace.get(va)!;
      const facesB = clusterFace.get(vb)!;
      const common = [...facesA].filter((f) => facesB.has(f));
      const allInOneFace = common.length === 1 && facesA.size === 1 && facesB.size === 1 && !triCap;
      if (allInOneFace && triFace === common[0]) {
        candidateMap.delete(key);
      }
    }
  }
  // 几何兜底 + 接缝处理：
  // - 两个以上邻接面且全部近平行 → 同面内部边，剔除；
  // - 单面边（T 型接缝）：若端点处存在共线邻边且其三角面与本边共面，
  //   说明是同一表面上的剖分接缝，剔除；真正的开放边界（无共线邻边）保留。
  const candidateEdges: CandEdge[] = [];
  for (const edge of candidateMap.values()) {
    if (edge.normals.length >= 2) {
      let coplanar = true;
      for (let i = 1; i < edge.normals.length; i++) {
        if (Math.abs(edge.normals[0].dot(edge.normals[i])) < SMOOTH_COS) {
          coplanar = false;
          break;
        }
      }
      if (coplanar) continue;
      candidateEdges.push(edge);
      continue;
    }

    // 单面边：T 型接缝或面内对角缝合线。
    // 只要在任一端点处存在另一条边，其邻接三角面与本边三角面共面，
    // 就说明本边躺在一个连续表面内部，应剔除。
    const pa = clusterPos[edge.a];
    const pb = clusterPos[edge.b];
    void pa;
    void pb;
    const ownNormal = edge.normals[0];
    let seamCovered = false;
    for (const other of candidateMap.values()) {
      if (other === edge) continue;
      const shared = other.a === edge.a || other.a === edge.b || other.b === edge.a || other.b === edge.b;
      if (!shared) continue;
      if (other.normals.some((n) => Math.abs(n.dot(ownNormal)) > SMOOTH_COS)) {
        seamCovered = true;
        break;
      }
    }
    if (seamCovered) continue;
    candidateEdges.push(edge);
  }

  // 聚类 → 原始顶点代表（投影坐标从原始顶点取）
  const clusterRep: number[] = [];
  for (let i = 0; i < clusterId.length; i++) {
    if (clusterRep[clusterId[i]] === undefined) clusterRep[clusterId[i]] = i;
  }

  const LINE_EPS = 0.12;
  const projectedSegments: { a: ProjectedPoint; b: ProjectedPoint }[] = [];
  for (const ce of candidateEdges) {
    const pa = projected[clusterRep[ce.a]];
    const pb = projected[clusterRep[ce.b]];
    if (Math.abs(pa.x - pb.x) < 1e-6 && Math.abs(pa.y - pb.y) < 1e-6) continue;
    projectedSegments.push({ a: pa, b: pb });
  }

  // 每条投影线用归一化方向 + 原点到直线的有符号距离标识
  interface Line2D {
    dx: number;
    dy: number;
    offset: number; // 原点到直线的有符号距离
    tMin: number;
    tMax: number;
    depthMin: number;
    depthMax: number;
    sampleCount: number;
  }
  const lineMap = new Map<string, Line2D>();
  const angleQ = (v: number) => Math.round(v / 0.004) * 0.004; // 角度量化 ≈0.23°
  const posQ = (v: number) => Math.round(v / LINE_EPS) * LINE_EPS;

  for (const seg of projectedSegments) {
    const sx = seg.b.x - seg.a.x;
    const sy = seg.b.y - seg.a.y;
    const len = Math.hypot(sx, sy);
    const dx = sx / len;
    const dy = sy / len;
    // 无向直线：方向统一到 dx>0 或 dx==0 时 dy>0
    const ux = dx < 0 || (Math.abs(dx) < 1e-9 && dy < 0) ? -dx : dx;
    const uy = dx < 0 || (Math.abs(dx) < 1e-9 && dy < 0) ? -dy : dy;
    const offset = seg.a.x * uy - seg.a.y * ux; // 叉积 = 原点有符号距离
    const key = `${angleQ(ux)},${angleQ(uy)}|${posQ(offset)}`;

    // 公共参数原点 = 原点在直线上的垂足 P0 = offset·(-dy, dx)
    const p0x = -uy * offset;
    const p0y = ux * offset;
    const tA = (seg.a.x - p0x) * ux + (seg.a.y - p0y) * uy;
    const tB = (seg.b.x - p0x) * ux + (seg.b.y - p0y) * uy;
    const t0 = Math.min(tA, tB);
    const t1 = Math.max(tA, tB);
    const d0 = seg.a.depth;
    const d1 = seg.b.depth;

    const existing = lineMap.get(key);
    if (existing) {
      existing.tMin = Math.min(existing.tMin, t0);
      existing.tMax = Math.max(existing.tMax, t1);
      existing.depthMin = Math.min(existing.depthMin, d0, d1);
      existing.depthMax = Math.max(existing.depthMax, d0, d1);
      existing.sampleCount++;
    } else {
      lineMap.set(key, {
        dx: ux,
        dy: uy,
        offset,
        tMin: t0,
        tMax: t1,
        depthMin: Math.min(d0, d1),
        depthMax: Math.max(d0, d1),
        sampleCount: 1,
      });
    }
  }

  // 由直线标识还原两个端点（取线上一点 + 方向 × 参数跨度）
  const edges: ProjectedEdge[] = [];
  for (const line of lineMap.values()) {
    // 线上最近原点的点 P = offset * (-dy, dx)
    const px = -line.dy * line.offset;
    const py = line.dx * line.offset;
    const a: ProjectedPoint = {
      x: px + line.dx * line.tMin,
      y: py + line.dy * line.tMin,
      depth: line.depthMin,
    };
    const b: ProjectedPoint = {
      x: px + line.dx * line.tMax,
      y: py + line.dy * line.tMax,
      depth: line.depthMax,
    };
    const mid: ProjectedPoint = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      depth: (line.depthMin + line.depthMax) / 2,
    };
    edges.push({ a, b, hidden: !edgeVisible(mid) });
  }

  // 剖切面多边形（aCap 三角形 → 2D 三角扇，SVG 端合并填充）
  const caps: ProjectedCap[] = [];
  const capAttr = geometry.getAttribute(ATTR_CAP);
  if (capAttr) {
    for (let t = 0; t < index.count; t += 3) {
      const i0 = index.getX(t);
      if (capAttr.getX(i0) < 0.5) continue;
      const tri = [i0, index.getX(t + 1), index.getX(t + 2)];
      const poly = tri.map((vi) => ({ x: projected[vi].x, y: projected[vi].y }));
      caps.push({ poly, depth: (projected[tri[0]].depth + projected[tri[2]].depth) / 2 });
    }
  }

  target.dispose();
  depthTex.dispose();
  camera.updateProjectionMatrix();
  return { def, edges, caps, bounds: { minX, minY, maxX, maxY } };
}

export interface ThreeViewResult {
  svg: string;
  views: { kind: ViewKind; title: string; edgeCount: number; hiddenCount: number; capCount: number }[];
  width: number;
  height: number;
}

/** 生成三视图 SVG（第一角画法，含可见线/隐藏线/剖面线/图框/标题） */
export function generateThreeViewSVG(renderer: THREE.WebGLRenderer, scene: THREE.Scene): ThreeViewResult | null {
  const entry = evaluated();
  if (entry.result.empty || !entry.geometry.attributes.position) return null;

  const mesh = new THREE.Mesh(entry.geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  scene.add(mesh);
  scene.updateMatrixWorld(true);

  const depthSize = 1024;
  const projected = VIEWS.map((def) => renderView(renderer, scene, mesh, def, depthSize));
  scene.remove(mesh);

  // 统一比例：所有视图 1mm = scale px，取所有视图最大跨度适配单元框
  const span = Math.max(
    ...projected.flatMap((p) => [p.bounds.maxX - p.bounds.minX, p.bounds.maxY - p.bounds.minY]),
  );
  const gap = 56;
  const titleH = 30;
  const cell = 360; // 每个视图固定单元尺寸
  const inner = cell - 110; // 内部绘图区（预留标题与边距）
  const scale = inner / span;
  const width = cell * 2 + gap;
  const height = cell * 2 + gap + titleH;

  // 全局模型包围盒（视图平面坐标），保证三个视图按同一原点对齐投影关系
  const gMinX = Math.min(...projected.map((p) => p.bounds.minX));
  const gMaxX = Math.max(...projected.map((p) => p.bounds.maxX));
  const gMinY = Math.min(...projected.map((p) => p.bounds.minY));
  const gMaxY = Math.max(...projected.map((p) => p.bounds.maxY));
  const gCx = (gMinX + gMaxX) / 2;
  const gCy = (gMinY + gMaxY) / 2;

  // 第一角画法：主视图(左上)、左视图在主视图右侧、俯视图在主视图下方
  // oy 为 SVG 坐标（向下为正），故俯视图 oy 更大
  const origins: Record<ViewKind, { ox: number; oy: number }> = {
    front: { ox: 0, oy: 0 },
    left: { ox: cell + gap, oy: 0 },
    top: { ox: 0, oy: cell + gap },
  };

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="SimSun, 'Noto Sans SC', sans-serif">`,
  );
  lines.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="#ffffff" stroke="#333" stroke-width="1"/>`);

  const summaries: ThreeViewResult['views'] = [];

  for (const pv of projected) {
    const { ox, oy } = origins[pv.def.kind];
    // 所有视图共享全局中心，比例一致 → 主俯长对正、主左高平齐
    const sx = (x: number) => ox + cell / 2 + (x - gCx) * scale;
    const sy = (y: number) => oy + cell / 2 - (y - gCy) * scale;

    lines.push(`<g id="view-${pv.def.kind}">`);
    lines.push(`<rect x="${ox + 0.5}" y="${oy + 0.5}" width="${cell - 1}" height="${cell - 1}" fill="none" stroke="#bbb" stroke-width="0.6" stroke-dasharray="4 3"/>`);

    // 剖面区域：所有 cap 三角面合并进一个 clipPath，浅灰底只画一次，
    // 45° 剖面线在像素坐标生成后由 clipPath 统一裁剪，避免逐三角重复。
    const hatchGap = Math.max(3, modelStore.model.clip.hatchGap);
    const clipId = `cap-clip-${pv.def.kind}`;
    if (pv.caps.length > 0) {
      lines.push(`<clipPath id="${clipId}">`);
      for (const cap of pv.caps) {
        const pts = cap.poly.map((p) => `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ');
        lines.push(`<polygon points="${pts}"/>`);
      }
      lines.push(`</clipPath>`);

      const xs = pv.caps.flatMap((c) => c.poly.map((p) => sx(p.x)));
      const ys = pv.caps.flatMap((c) => c.poly.map((p) => sy(p.y)));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      lines.push(
        `<rect x="${minX.toFixed(2)}" y="${minY.toFixed(2)}" width="${(maxX - minX).toFixed(2)}" height="${(maxY - minY).toFixed(2)}" fill="#f3f3f3" clip-path="url(#${clipId})"/>`,
      );
      // 45° 剖面线（像素坐标，间距由模型单位换算到像素）
      const gapPx = Math.max(2.5, hatchGap * scale);
      const diag = (maxX - minX) + (maxY - minY);
      lines.push(`<g clip-path="url(#${clipId})" stroke="#1a1a1a" stroke-width="0.7">`);
      for (let c = -diag; c <= diag; c += gapPx) {
        const x1 = minX + c;
        const x2 = x1 + (maxY - minY);
        lines.push(`<line x1="${x1.toFixed(2)}" y1="${minY.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${maxY.toFixed(2)}"/>`);
      }
      lines.push(`</g>`);
    }

    let visible = 0;
    let hidden = 0;
    for (const e of pv.edges) {
      const x1 = sx(e.a.x).toFixed(2);
      const y1 = sy(e.a.y).toFixed(2);
      const x2 = sx(e.b.x).toFixed(2);
      const y2 = sy(e.b.y).toFixed(2);
      if (e.hidden) {
        hidden++;
        lines.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" stroke-width="0.6" stroke-dasharray="5 3" stroke-linecap="round"/>`,
        );
      } else {
        visible++;
        lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="1.1"/>`);
      }
    }
    lines.push(`<text x="${ox + cell / 2}" y="${oy + cell - 8}" text-anchor="middle" font-size="15" fill="#222">${pv.def.title}</text>`);
    lines.push(`</g>`);
    summaries.push({
      kind: pv.def.kind,
      title: pv.def.title,
      edgeCount: visible,
      hiddenCount: hidden,
      capCount: pv.caps.length,
    });
  }

  lines.push(`</svg>`);
  return { svg: lines.join('\n'), views: summaries, width, height };
}

