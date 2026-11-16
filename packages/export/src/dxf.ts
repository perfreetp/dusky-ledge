import type { FlatPattern } from '@pg/shared';

/**
 * 极简 AutoCAD DXF R12 写出器（车间通用，无第三方依赖）。
 * 图层：OUTLINE(轮廓) / ALIGN(对位线) / CUT(切口) / LABEL(标注) / GRID(网格)
 */
export function buildDxf(pattern: FlatPattern, title = '护套下料图'): string {
  const lines: string[] = [];
  const w = (code: number, value: string | number) =>
    lines.push(String(code).padStart(3, ' '), String(value));

  w(0, 'SECTION');
  w(2, 'HEADER');
  w(9, '$ACADVER');
  w(1, 'AC1009');
  w(0, 'ENDSEC');

  // 表段：图层
  w(0, 'SECTION');
  w(2, 'TABLES');
  w(0, 'TABLE');
  w(2, 'LAYER');
  w(70, 5);
  for (const name of ['OUTLINE', 'ALIGN', 'CUT', 'LABEL', 'GRID']) {
    w(0, 'LAYER');
    w(2, name);
    w(70, 0);
    w(62, name === 'CUT' ? 1 : name === 'ALIGN' ? 3 : 7);
    w(6, 'CONTINUOUS');
  }
  w(0, 'ENDTAB');
  w(0, 'ENDSEC');

  // 实体段
  w(0, 'SECTION');
  w(2, 'ENTITIES');

  // 轮廓 LWPOLYLINE（R12 用 POLYLINE/VERTEX，70=1 闭合）
  w(0, 'POLYLINE');
  w(8, 'OUTLINE');
  w(66, 1);
  w(70, 1); // 闭合
  for (const p of pattern.outline) {
    w(0, 'VERTEX');
    w(8, 'OUTLINE');
    w(10, p[0]);
    w(20, p[1]);
  }
  w(0, 'SEQEND');

  // 切口线
  for (const c of pattern.cutLines) {
    w(0, 'LINE');
    w(8, 'CUT');
    w(10, c.from[0]);
    w(20, c.from[1]);
    w(11, c.to[0]);
    w(21, c.to[1]);
  }

  // 对位线
  for (const a of pattern.alignmentMarks) {
    w(0, 'LINE');
    w(8, 'ALIGN');
    w(10, a.from[0]);
    w(20, a.from[1]);
    w(11, a.to[0]);
    w(21, a.to[1]);
  }

  // 网格
  for (const g of pattern.gridLines) {
    w(0, 'LINE');
    w(8, 'GRID');
    w(10, g.from[0]);
    w(20, g.from[1]);
    w(11, g.to[0]);
    w(21, g.to[1]);
  }

  // 文字标注
  w(0, 'TEXT');
  w(8, 'LABEL');
  w(10, 2);
  w(20, pattern.height - 4);
  w(40, 6);
  w(1, title);
  for (const l of pattern.labels) {
    w(0, 'TEXT');
    w(8, 'LABEL');
    w(10, l.position[0]);
    w(20, l.position[1]);
    w(40, l.size);
    w(1, l.text);
  }

  w(0, 'ENDSEC');
  w(0, 'EOF');
  return lines.join('\n');
}
