import { describe, it, expect } from 'vitest';
import type { FlatPattern } from '@pg/shared';
import { buildDxf } from '../src/dxf.js';
import { buildSvg } from '../src/svg.js';

const pattern: FlatPattern = {
  width: 220,
  height: 114.2,
  outline: [
    [10, 10],
    [210, 10],
    [210, 104.2],
    [10, 104.2],
  ],
  alignmentMarks: [{ from: [107, 36], to: [113, 36], label: 'S01-J2' }],
  cutLines: [
    { from: [10, 10], to: [10, 104.2], kind: 'seam' },
    { from: [110, 10], to: [110, 104.2], kind: 'segment' },
  ],
  labels: [{ position: [12, 56], text: 'PRJ-S01-J1', size: 5 }],
  gridLines: [{ from: [10, 57], to: [210, 57] }],
  area: 18840,
};

describe('DXF export', () => {
  it('emits R12 header, layers and entity counts', () => {
    const dxf = buildDxf(pattern);
    expect(dxf).toContain('AC1009');
    expect(dxf).toContain('OUTLINE');
    expect(dxf).toContain('ALIGN');
    expect(dxf).toContain('CUT');
    expect(dxf).toContain('LABEL');
    // 2 条切口 LINE + 1 对位 LINE + 1 网格 LINE
    expect(dxf.match(/LINE/g)?.length).toBeGreaterThanOrEqual(4);
    expect(dxf.match(/VERTEX/g)?.length).toBe(4);
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('SVG contains outline polygon and red cuts', () => {
    const svg = buildSvg(pattern);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<polygon');
    expect(svg).toContain('d40000');
    expect(svg).toContain('PRJ-S01-J1');
  });

  it('escapes XML special chars in labels', () => {
    const svg = buildSvg({ ...pattern, labels: [{ position: [0, 0], text: 'A<B>&"C', size: 4 }] });
    expect(svg).toContain('A&lt;B&gt;&amp;&quot;C');
  });
});
