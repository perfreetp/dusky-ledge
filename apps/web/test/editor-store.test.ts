import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEditorStore } from '../src/stores/editor.js';

describe('editor store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('starts with demo control points across joints', () => {
    const s = useEditorStore();
    expect(s.controlPoints.length).toBeGreaterThanOrEqual(3);
    expect(new Set(s.controlPoints.map((p) => p.jointId)).size).toBeGreaterThan(1);
  });

  it('moves a point and marks dirty', () => {
    const s = useEditorStore();
    const id = s.controlPoints[0]!.id;
    s.movePoint(id, [12, 34, 56]);
    expect(s.controlPoints[0]!.position).toEqual([12, 34, 56]);
    expect(s.dirty).toBe(true);
  });

  it('inserts a point after the selected one', () => {
    const s = useEditorStore();
    const before = s.controlPoints.length;
    const id = s.controlPoints[1]!.id;
    s.select(id);
    s.addPointAfter(id);
    expect(s.controlPoints.length).toBe(before + 1);
    expect(s.controlPoints[2]!.id).not.toBe(id);
  });

  it('refuses to remove below two points', () => {
    const s = useEditorStore();
    while (s.controlPoints.length > 2) {
      s.removePoint(s.controlPoints[0]!.id);
    }
    const min = s.controlPoints.length;
    s.removePoint(s.controlPoints[0]!.id);
    expect(s.controlPoints.length).toBe(min);
  });

  it('updates weight and interpolation', () => {
    const s = useEditorStore();
    const id = s.controlPoints[0]!.id;
    s.updatePoint(id, { weight: 3.5 });
    expect(s.controlPoints[0]!.weight).toBe(3.5);
    s.setInterpolation('nurbs');
    expect(s.interpolation).toBe('nurbs');
  });

  it('builds a serializable spline model', () => {
    const s = useEditorStore();
    const m = s.model;
    expect(m.controlPoints).toHaveLength(s.controlPoints.length);
    expect(JSON.parse(JSON.stringify(m)).interpolation).toBe(m.interpolation);
  });
});
