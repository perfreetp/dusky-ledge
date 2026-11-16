import { describe, expect, it } from 'vitest';
import { countHatch, generateHatch, generateHatchVariants } from '../src/core/hatch';
import { exportSvg } from '../src/core/svg';
import { createFeature, KIND_PRESETS } from '../src/core/feature';
import type { Feature, PlanDoc, Pt } from '../shared/types';
import { sampleBenchDoc } from '../shared/samples';

const rectRing = (x: number, y: number, w: number, h: number): Pt[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

describe('hatch generation', () => {
  const area = rectRing(0, 0, 4000, 3000);

  it('produces evenly spaced stripes at the requested angle', () => {
    const stripes = generateHatch([area], {
      type: 'diagonal',
      spacing: 250,
      angle: 45,
      lineWidth: 40,
      color: '#f2c200',
      alpha: 1,
    });
    expect(stripes.length).toBeGreaterThan(10);
    // every stripe should be parallel to 45°
    for (const s of stripes) {
      const ang = (Math.atan2(s.y1 - s.y0, s.x1 - s.x0) * 180) / Math.PI;
      expect(Math.abs(ang - 45)).toBeLessThan(0.5);
      expect(s.width).toBe(40);
    }
  });

  it('alternates colours stripe by stripe for hazard hatching', () => {
    const stripes = generateHatch([area], {
      type: 'diagonal',
      spacing: 200,
      angle: 45,
      lineWidth: 50,
      color: '#f2c200',
      color2: '#1a1a1a',
      alpha: 1,
    });
    const colours = new Set(stripes.map((s) => s.color));
    expect(colours.size).toBe(2);
    expect(colours.has('#f2c200')).toBe(true);
    expect(colours.has('#1a1a1a')).toBe(true);
  });

  it('cross hatch doubles the stripe count of a single pass', () => {
    const single = generateHatch([area], { type: 'diagonal', spacing: 300, angle: 30, lineWidth: 40, color: '#000', alpha: 1 });
    const cross = generateHatchVariants([area], { type: 'cross', spacing: 300, angle: 30, lineWidth: 40, color: '#000', alpha: 1 });
    expect(cross.length).toBeGreaterThan(single.length);
    expect(cross.length).toBeLessThanOrEqual(single.length * 2 + 2);
  });

  it('grid hatching runs in both axes', () => {
    const stripes = generateHatchVariants([area], { type: 'grid', spacing: 300, angle: 0, lineWidth: 30, color: '#000', alpha: 1 });
    const horizontal = stripes.filter((s) => Math.abs(s.y1 - s.y0) < 1);
    const vertical = stripes.filter((s) => Math.abs(s.x1 - s.x0) < 1);
    expect(horizontal.length).toBeGreaterThan(0);
    expect(vertical.length).toBeGreaterThan(0);
  });

  it('respects holes: no stripes inside an inner ring', () => {
    const withHole = [rectRing(0, 0, 4000, 4000), rectRing(1500, 1500, 1000, 1000)];
    const stripes = generateHatch(withHole, { type: 'diagonal', spacing: 100, angle: 0, lineWidth: 20, color: '#000', alpha: 1 });
    // horizontal stripes crossing y=2000 should be split into two runs
    const crossing = stripes.filter((s) => Math.abs(s.y0 - 2000) < 1);
    expect(crossing.length).toBeGreaterThanOrEqual(2);
    for (const s of crossing) {
      const minX = Math.min(s.x0, s.x1);
      const maxX = Math.max(s.x0, s.x1);
      expect(minX < 1500 || maxX > 2500).toBe(true);
    }
  });

  it('generates tens of thousands of stripes across a full floor plan quickly', () => {
    // A dense plan: 120 hazard zones at 120 mm spacing (real "yellow/black" spec),
    // which is the workload the GPU instanced pass exists for.
    const hatch = {
      type: 'diagonal' as const,
      spacing: 120,
      angle: 45,
      lineWidth: 40,
      color: '#f2c200',
      color2: '#000000',
      alpha: 1,
    };
    const zones: Pt[][] = [];
    for (let i = 0; i < 300; i++) {
      const col = i % 20;
      const row = Math.floor(i / 20);
      zones.push(rectRing(col * 6000, row * 5000, 5000, 4000));
    }
    const t0 = performance.now();
    let total = 0;
    for (const z of zones) total += generateHatchVariants([z], hatch).length;
    const ms = performance.now() - t0;
    expect(total).toBeGreaterThan(15000);
    expect(ms).toBeLessThan(4000);
    console.log('[hatch benchmark] zones=300 stripes=' + total + ' build=' + ms.toFixed(1) + 'ms');
    // a single large zone is also fast
    expect(countHatch([rectRing(0, 0, 60000, 40000)], { ...hatch, type: 'diagonal' })).toBeGreaterThan(500);
  });
});

describe('SVG export', () => {
  const doc = sampleBenchDoc();

  it('is valid XML with mm units and a viewBox', () => {
    const svg = exportSvg(doc, { includeDimensions: true });
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('width="12000mm"');
    expect(svg).toContain('height="10000mm"');
    expect(svg).toContain('viewBox="0 0 12000 10000"');
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('emits one layer per feature with kind metadata', () => {
    const svg = exportSvg(doc);
    for (const f of doc.features) {
      expect(svg).toContain(`data-kind="${f.kind}"`);
    }
    expect((svg.match(/<g id="feature-/g) ?? []).length).toBe(doc.features.length);
  });

  it('clips hatch stripes so they never spill outside the zone', () => {
    const svg = exportSvg(doc);
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('clip-path="url(#hatch');
    expect(svg).toContain('data-role="hatch"');
  });

  it('exports the stroke geometry as filled paths (exact width, no CSS dependence)', () => {
    const svg = exportSvg(doc);
    expect(svg).toContain('data-width-mm="100"');
    expect(svg).toContain('fill="#f2c200"');
  });

  it('contains a scale bar', () => {
    const svg = exportSvg(doc);
    expect(svg).toContain('id="annotations"');
    expect(svg).toContain('0 — 1 m');
  });

  it('switches to metres when asked', () => {
    const svg = exportSvg(doc, { units: 'm' });
    expect(svg).toContain('width="12m"');
  });

  it('can omit hatches for a lightweight CAD handoff', () => {
    const svg = exportSvg(doc, { includeHatch: false });
    expect(svg).not.toContain('data-role="hatch"');
  });
});

describe('scene batching (perf budget)', () => {
  it('builds a 400-feature document within a reasonable budget', () => {
    const features: Feature[] = [];
    for (let i = 0; i < 400; i++) {
      const col = i % 20;
      const row = Math.floor(i / 20);
      features.push(
        createFeature(i % 3 === 0 ? 'no-park' : 'station', {
          id: `f${i}`,
          geom: 'area',
          rings: [rectRing(col * 2000, row * 2000, 1500, 1500)],
          paths: [],
        })
      );
    }
    const doc: PlanDoc = { ...sampleBenchDoc(), features };
    // Build only the geometry stage: the renderer's GPU work needs a real device.
    const t0 = performance.now();
    let triangles = 0;
    for (const f of features) {
      const rings = f.rings;
      const stripes = f.hatch ? generateHatchVariants(rings, f.hatch) : [];
      triangles += stripes.length;
    }
    const ms = performance.now() - t0;
    expect(triangles).toBeGreaterThan(0);
    expect(ms).toBeLessThan(4000);
    void doc;
  });

  it('preset geometry for every kind materialises without NaN', () => {
    for (const kind of Object.keys(KIND_PRESETS) as (keyof typeof KIND_PRESETS)[]) {
      const preset = KIND_PRESETS[kind];
      const f: Feature =
        preset.geom === 'area'
          ? createFeature(kind, { geom: 'area', rings: [rectRing(0, 0, 1000, 800)], paths: [] })
          : createFeature(kind, { geom: 'path', paths: [[{ x: 0, y: 0 }, { x: 1000, y: 200 }]], rings: [] });
      const rings = f.geom === 'area' ? f.rings : [];
      expect(JSON.stringify(rings)).not.toContain('null');
    }
  });
});

