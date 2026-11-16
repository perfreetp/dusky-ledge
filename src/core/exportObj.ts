import type { MeshResult } from '../core/mesher';
import type { Dims } from '../core/layers';
import { MATERIALS, hexToRgb } from '../core/materials';

export interface ObjOptions {
  /** 每个体素边的世界长度（减面后放大，保持模型外形不变） */
  scale?: number;
  name?: string;
}

export function meshToObj(mesh: MeshResult, dims: Dims, opts: ObjOptions | string = {}): string {
  const options: ObjOptions = typeof opts === 'string' ? { name: opts } : opts;
  const scale = options.scale && options.scale > 0 ? options.scale : 1;
  const name = options.name ?? 'stratum';
  const lines: string[] = [];
  lines.push('# 三维体素地层模型 · 考古实习教学工具导出');
  lines.push(`# 网格 ${dims.nx} × ${dims.ny} × ${dims.nz}（体素单位：${scale}）`);
  lines.push(`# 四边形 ${mesh.quadCount}，三角面 ${mesh.triCount}`);
  lines.push(`o ${name}`);
  const fmt = (v: number) => {
    const s = (v * scale).toFixed(4);
    return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  };
  let vertexBase = 1;
  for (const batch of mesh.batches) {
    const mat = MATERIALS.find((m) => m.id === batch.material);
    lines.push(`g ${name}_${mat ? `mat${mat.id}_${mat.short}` : 'selection'}`);
    if (mat) lines.push(`usemtl ${mat.name}`);
    const v = batch.vertices;
    const count = v.length / 6;
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      lines.push(`v ${fmt(v[o])} ${fmt(v[o + 1])} ${fmt(v[o + 2])}`);
    }
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      lines.push(`vn ${v[o + 3]} ${v[o + 4]} ${v[o + 5]}`);
    }
    const quads = count / 4;
    for (let q = 0; q < quads; q++) {
      const a = vertexBase + q * 4;
      lines.push(`f ${a}//${a} ${a + 1}//${a + 1} ${a + 2}//${a + 2}`);
      lines.push(`f ${a}//${a} ${a + 2}//${a + 2} ${a + 3}//${a + 3}`);
    }
    vertexBase += count;
  }
  return lines.join('\n') + '\n';
}

/** 配套 MTL 材质文件 */
export function meshToMtl(mesh: MeshResult): string {
  const lines = ['# 土色材质', ''];
  for (const batch of mesh.batches) {
    const mat = MATERIALS.find((m) => m.id === batch.material);
    if (!mat) continue;
    const [r, g, b] = hexToRgb(mat.hex);
    lines.push(`newmtl ${mat.name}`);
    lines.push(`Kd ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`);
    lines.push('Ka 0.1 0.1 0.1');
    lines.push('Ks 0.05 0.05 0.05');
    lines.push('Ns 8');
    lines.push('illum 2');
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 统计 OBJ 文本中的顶点/三角面（供测试与界面核对） */
export function countObj(text: string): { vertices: number; triangles: number } {
  let vertices = 0;
  let triangles = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) vertices++;
    else if (line.startsWith('f ')) triangles++;
  }
  return { vertices, triangles };
}
