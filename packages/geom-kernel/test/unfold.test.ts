import { describe, it, expect } from 'vitest';
import type { ControlPoint, ProjectRules } from '@pg/shared';
import { DEFAULT_PROJECT_RULES } from '@pg/shared';
import { evaluateSpline } from '../src/spline/evaluator.js';
import { buildTube, tubeSurfaceArea } from '../src/tube.js';
import { unfoldTube } from '../src/unfold.js';
import { computeSegmentRanges } from '../src/segments.js';

const cp = (pos: [number, number, number], jointId: string, i: number): ControlPoint => ({
  id: `p${i}`,
  position: pos,
  weight: 1,
  jointId,
});

const rules: ProjectRules = { ...DEFAULT_PROJECT_RULES, radialSegments: 32, tubularSegments: 200 };

describe('unfold flat pattern', () => {
  it('straight tube unfolds to rectangle with area conservation < 1%', () => {
    const points = [cp([0, 0, 0], 'J1', 0), cp([100, 0, 0], 'J1', 1), cp([200, 0, 0], 'J1', 2)];
    const r = evaluateSpline('linear', points, { samples: 200 });
    const tube = buildTube(r, {
      radius: 15,
      radialSegments: rules.radialSegments,
      tubularSegments: rules.tubularSegments,
      layer: 'outer',
    });
    const ranges = computeSegmentRanges(points, r);
    const flat = unfoldTube(tube, { segmentRanges: ranges, segmentNames: ['S01-J1'] });

    // 矩形：长 200、宽 2πr
    expect(flat.width).toBeGreaterThan(200);
    expect(flat.height).toBeCloseTo(2 * Math.PI * 15 + 20, 5);

    const surfaceArea = tubeSurfaceArea(tube);
    const errPct = (Math.abs(flat.area - surfaceArea) / surfaceArea) * 100;
    expect(errPct).toBeLessThan(1);
  });

  it('alignment marks and segment cuts match joint segmentation', () => {
    const points = [
      cp([0, 0, 0], 'J1', 0),
      cp([50, 0, 0], 'J1', 1),
      cp([100, 0, 0], 'J2', 2),
      cp([150, 0, 0], 'J3', 3),
      cp([200, 0, 0], 'J3', 4),
    ];
    const r = evaluateSpline('linear', points, { samples: 200 });
    const tube = buildTube(r, {
      radius: 15,
      radialSegments: 24,
      tubularSegments: 200,
      layer: 'outer',
    });
    const ranges = computeSegmentRanges(points, r);
    expect(ranges.map((x) => x.jointId)).toEqual(['J1', 'J2', 'J3']);
    const flat = unfoldTube(tube, {
      segmentRanges: ranges,
      segmentNames: ranges.map((x, i) => `S0${i + 1}-${x.jointId}`),
    });
    const segCuts = flat.cutLines.filter((c) => c.kind === 'segment');
    expect(segCuts).toHaveLength(2); // 3 段 → 2 条分段切口
    expect(flat.alignmentMarks.length).toBeGreaterThan(0);
    expect(flat.labels.map((l) => l.text)).toContain('S01-J1');
  });

  it('bent tube flat pattern area stays within 1% of 3D surface', () => {
    const points = [
      cp([0, 0, 0], 'J1', 0),
      cp([80, 0, 0], 'J1', 1),
      cp([120, 40, 0], 'J2', 2),
      cp([120, 100, 0], 'J2', 3),
      cp([60, 140, 20], 'J3', 4),
    ];
    const r = evaluateSpline('catmullRom', points, { samples: 300 });
    const tube = buildTube(r, {
      radius: 15,
      radialSegments: 32,
      tubularSegments: 300,
      layer: 'outer',
    });
    const ranges = computeSegmentRanges(points, r);
    const flat = unfoldTube(tube, {
      segmentRanges: ranges,
      segmentNames: ranges.map((_, i) => `S0${i}`),
    });
    const surfaceArea = tubeSurfaceArea(tube);
    const errPct = (Math.abs(flat.area - surfaceArea) / surfaceArea) * 100;
    expect(errPct).toBeLessThan(1);
  });
});
