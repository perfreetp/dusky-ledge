import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import type { FeatureKind, Pt } from '@shared/types';
import { store, type ToolId, type VertexRef } from '@/state/editor';
import { hitFeature, hitFeatureAll } from '@/core/ops';
import { featureBoundsInclStroke } from '@/core/feature';
import { dist, type Rect } from '@/core/math';
import { constrainAngle } from '@/core/ops';

interface Options {
  overlayCanvas: Ref<HTMLCanvasElement | null>;
  markOverlayDirty: () => void;
  readOnly: () => boolean;
}

type DragMode =
  | { kind: 'none' }
  | { kind: 'pan'; last: Pt }
  | { kind: 'marquee'; start: Pt }
  | { kind: 'move'; start: Pt; last: Pt; ids: string[] }
  | { kind: 'vertices'; start: Pt; last: Pt; refs: VertexRef[] }
  | { kind: 'draft' };

const DRAW_TOOLS: ToolId[] = ['channel', 'walkway', 'firelane', 'park', 'station', 'material', 'hazard', 'rect', 'polygon', 'measure'];

export function useCanvasInteractions(opts: Options) {
  const marquee = ref<Rect | null>(null);
  const cursor = ref<Pt>({ x: 0, y: 0 });
  const spaceDown = ref(false);
  let drag: DragMode = { kind: 'none' };
  let pointerId = -1;
  let attached = false;

  const canvas = () => opts.overlayCanvas.value;

  const eventPoint = (e: PointerEvent | MouseEvent | WheelEvent): Pt => {
    const c = canvas()!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const worldAt = (e: PointerEvent | MouseEvent | WheelEvent): Pt => {
    const p = eventPoint(e);
    return store.screenToWorld(p.x, p.y);
  };

  const snapFor = (world: Pt, exclude?: string[]): Pt => {
    const { p, hit } = store.snapPoint(world, 13, exclude);
    store.snapHit.value = hit;
    return p;
  };

  /** Find a vertex handle under the cursor in screen space. */
  const vertexAt = (screen: Pt, radius = 7): VertexRef | null => {
    const selected = store.selectedFeatures;
    for (const f of selected) {
      const lines = f.geom === 'area' ? f.rings : f.paths;
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        for (let i = 0; i < line.length; i++) {
          const sp = store.worldToScreen(line[i]);
          if (dist(sp, screen) <= radius) {
            return {
              featureId: f.id,
              which: f.geom === 'area' ? { type: 'ring', index: li } : { type: 'path', index: li },
              index: i,
            };
          }
        }
      }
    }
    return null;
  };

  const edgeHit = (screen: Pt, tolerance = 6): { ref: VertexRef; point: Pt } | null => {
    const selected = store.selectedFeatures;
    for (const f of selected) {
      const lines = f.geom === 'area' ? f.rings : f.paths;
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const n = line.length;
        const closed = f.geom === 'area';
        for (let i = 0; i < (closed ? n : n - 1); i++) {
          const a = store.worldToScreen(line[i]);
          const b = store.worldToScreen(line[(i + 1) % n]);
          const abx = b.x - a.x;
          const aby = b.y - a.y;
          const l2 = abx * abx + aby * aby;
          if (l2 < 1e-6) continue;
          let t = ((screen.x - a.x) * abx + (screen.y - a.y) * aby) / l2;
          if (t < 0.06 || t > 0.94) continue;
          const q = { x: a.x + abx * t, y: a.y + aby * t };
          if (dist(q, screen) <= tolerance) {
            const world = {
              x: line[i].x + (line[(i + 1) % n].x - line[i].x) * t,
              y: line[i].y + ((line[(i + 1) % n].y - line[i].y) * t),
            };
            return {
              ref: { featureId: f.id, which: f.geom === 'area' ? { type: 'ring', index: li } : { type: 'path', index: li }, index: i },
              point: world,
            };
          }
        }
      }
    }
    return null;
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return;
    const c = canvas();
    if (!c) return;
    c.setPointerCapture(e.pointerId);
    pointerId = e.pointerId;
    const screen = eventPoint(e);
    const world = worldAt(e);
    opts.markOverlayDirty();

    if (e.button === 1 || spaceDown.value || store.tool.value === 'pan') {
      drag = { kind: 'pan', last: screen };
      return;
    }
    if (store.calibration.value) {
      // calibration clicks are in world space, unsnapped, so the operator can pick
      // exact corners of a bay or a door opening
      store.calibPoint(world);
      opts.markOverlayDirty();
      return;
    }
    if (opts.readOnly()) {
      // review mode: allow panning only
      drag = { kind: 'pan', last: screen };
      return;
    }

    const tool = store.tool.value;
    const isDraw = DRAW_TOOLS.includes(tool);

    if (isDraw) {
      const snapped = snapFor(world);
      const d = store.draft.value;
      if (!d) {
        const areaKindOf: Partial<Record<ToolId, FeatureKind>> = {
          park: 'no-park',
          station: 'station',
          material: 'material',
          hazard: 'hazard',
        };
        const areaKind = areaKindOf[tool];
        if (tool === 'rect') {
          store.startDraft('rect', snapped, 'material');
        } else if (tool === 'polygon' || (areaKind && e.altKey)) {
          // free polygon: click each corner, double-click / Enter closes
          store.startDraft('polygon', snapped, areaKind ?? 'material');
        } else if (areaKind) {
          // drag a rectangle by default
          store.startDraft('rect', snapped, areaKind);
        } else if (tool === 'measure') {
          store.startDraft('measure', snapped);
        } else {
          const pathKind: FeatureKind = tool === 'walkway' ? 'walkway' : tool === 'firelane' ? 'fire-lane' : 'main-channel';
          store.startDraft(tool as 'channel' | 'walkway' | 'firelane', snapped, pathKind);
        }
        drag = { kind: 'draft' };
      } else {
        // continue a polyline / polygon with another committed vertex
        store.appendDraftPoint(snapped);
      }
      return;
    }

    // ---- select tool ----
    const v = vertexAt(screen);
    if (v) {
      if (e.shiftKey) {
        store.selectedVertices.value = [...store.selectedVertices.value, v];
      } else if (!store.selectedVertices.value.some((x) => x.featureId === v.featureId && x.index === v.index)) {
        store.selectedVertices.value = [v];
      }
      drag = { kind: 'vertices', start: world, last: world, refs: [...store.selectedVertices.value] };
      return;
    }
    store.selectedVertices.value = [];

    const ids = hitFeatureAll(store.doc.value, world, 9 * store.camera.scale);
    const id = ids[0] ?? null;
    if (id) {
      if (e.shiftKey) {
        // cycle: pick the first stacked feature that is not selected yet, so
        // shift-clicking overlapping zones eventually selects all of them
        const next = ids.find((x) => !store.selection.value.includes(x)) ?? id;
        store.select([next], true);
      } else if (!store.selection.value.includes(id)) {
        store.select([id]);
      }
      drag = { kind: 'move', start: world, last: world, ids: [...store.selection.value] };
      return;
    }

    if (!e.shiftKey) store.clearSelection();
    marquee.value = { minX: world.x, minY: world.y, maxX: world.x, maxY: world.y };
    drag = { kind: 'marquee', start: world };
  };

  const onPointerMove = (e: PointerEvent) => {
    const c = canvas();
    if (!c) return;
    const screen = eventPoint(e);
    cursor.value = worldAt(e);
    const world = cursor.value;
    opts.markOverlayDirty();

    if (drag.kind === 'none') {
      // hover + default snap preview
      if (store.tool.value === 'select' && !opts.readOnly()) {
        const id = hitFeature(store.doc.value, world, 9 * store.camera.scale);
        if (id !== store.hoverId.value) store.hoverId.value = id;
      } else if (store.hoverId.value) {
        store.hoverId.value = null;
      }
      if (DRAW_TOOLS.includes(store.tool.value) && store.draft.value) {
        const snapped = snapFor(world);
        store.updateDraft(snapped);
        opts.markOverlayDirty();
      } else if (DRAW_TOOLS.includes(store.tool.value)) {
        snapFor(world);
        opts.markOverlayDirty();
      }
      return;
    }

    switch (drag.kind) {
      case 'pan': {
        store.panBy(screen.x - drag.last.x, screen.y - drag.last.y);
        drag.last = screen;
        break;
      }
      case 'marquee': {
        marquee.value = {
          minX: Math.min(drag.start.x, world.x),
          minY: Math.min(drag.start.y, world.y),
          maxX: Math.max(drag.start.x, world.x),
          maxY: Math.max(drag.start.y, world.y),
        };
        break;
      }
      case 'move': {
        const delta = { x: world.x - drag.last.x, y: world.y - drag.last.y };
        drag.last = world;
        if (Math.abs(delta.x) > 1e-6 || Math.abs(delta.y) > 1e-6) {
          store.moveBy(delta, drag.ids);
        }
        break;
      }
      case 'vertices': {
        let target = world;
        if (e.shiftKey && drag.refs.length === 1) {
          // constrain to 15° increments around the neighbouring vertex
          const ref = drag.refs[0];
          const f = store.doc.value.features.find((x) => x.id === ref.featureId);
          if (f) {
            const lines = ref.which.type === 'ring' ? f.rings : f.paths;
            const line = lines[ref.which.index];
            const prev = line[(ref.index - 1 + line.length) % line.length];
            const next = line[(ref.index + 1) % line.length];
            const anchor = dist(prev, line[ref.index]) < dist(next, line[ref.index]) ? prev : next;
            target = constrainAngle(anchor, world, 15);
          }
        }
        const snapped = snapFor(target, [drag.refs[0]?.featureId].filter(Boolean) as string[]);
        const dx = snapped.x - drag.last.x;
        const dy = snapped.y - drag.last.y;
        drag.last = snapped;
        for (const ref of drag.refs) {
          const f = store.doc.value.features.find((x) => x.id === ref.featureId);
          if (!f) continue;
          const lines = ref.which.type === 'ring' ? f.rings : f.paths;
          const line = lines[ref.which.index];
          if (!line?.[ref.index]) continue;
          const p = line[ref.index];
          store.moveVertex(ref, { x: p.x + dx, y: p.y + dy }, `vertices-${drag.refs.map((r) => r.featureId + r.index).join('_')}`);
        }
        break;
      }
      case 'draft': {
        let snapped = snapFor(world);
        const d = store.draft.value;
        if (!d) break;
        if (d.kind === 'rect') {
          // keep square with shift
          if (e.shiftKey) {
            const a = d.points[0];
            const dx = Math.abs(snapped.x - a.x);
            const dy = Math.abs(snapped.y - a.y);
            const s = Math.max(dx, dy);
            snapped = { x: a.x + Math.sign(snapped.x - a.x || 1) * s, y: a.y + Math.sign(snapped.y - a.y || 1) * s };
          }
        } else if (d.points.length >= 1) {
          const a = d.points[d.points.length - 1];
          if (e.shiftKey) snapped = constrainAngle(a, snapped, 15);
        }
        store.updateDraft(snapped);
        break;
      }
    }
    opts.markOverlayDirty();
  };

  const onPointerUp = (e: PointerEvent) => {
    const c = canvas();
    if (c && pointerId >= 0) {
      try {
        c.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    pointerId = -1;
    if (drag.kind === 'marquee' && marquee.value) {
      const rect = marquee.value;
      if (Math.abs(rect.maxX - rect.minX) > 4 || Math.abs(rect.maxY - rect.minY) > 4) {
        const ids = store.features
          .filter((f) => f.visible && !f.locked)
          .filter((f) => {
            const b = featureBoundsInclStroke(f);
            return !(b.maxX < rect.minX || b.minX > rect.maxX || b.maxY < rect.minY || b.minY > rect.maxY);
          })
          .map((f) => f.id);
        store.select(ids, e.shiftKey);
      }
      marquee.value = null;
    }
    if (drag.kind === 'move' || drag.kind === 'vertices') {
      store.history.commit();
    }
    if (drag.kind === 'draft') {
      const d = store.draft.value;
      // Rectangle drags commit on pointer-up. Polylines / polygons stay in progress
      // until double-click, Enter, or a right-click that cancels.
      if (d && d.kind === 'rect') {
        store.commitDraft();
      }
    }
    drag = { kind: 'none' };
    opts.markOverlayDirty();
  };

  const onDoubleClick = (e: MouseEvent) => {
    const d = store.draft.value;
    if (d) {
      // the double-click's two clicks already appended vertices; drop the duplicate
      const pts = d.points;
      if (pts.length >= 2) {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        if (dist(last, prev) < 0.5) d.points = pts.slice(0, -1);
      }
      store.commitDraft();
      opts.markOverlayDirty();
      return;
    }
    // double click on an edge inserts a vertex
    const screen = eventPoint(e);
    const hit = edgeHit(screen);
    if (hit) {
      store.insertVertex(hit.ref, hit.point);
      opts.markOverlayDirty();
    }
  };

  const onWheel = (e: WheelEvent) => {
    if (!canvas()) return;
    e.preventDefault();
    const screen = eventPoint(e);
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    store.zoomAt(screen.x, screen.y, factor);
    opts.markOverlayDirty();
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (store.draft.value) {
      store.cancelDraft();
      opts.markOverlayDirty();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey;

    if (e.code === 'Space' && !spaceDown.value) {
      spaceDown.value = true;
      e.preventDefault();
    }
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
      opts.markOverlayDirty();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      store.redo();
      opts.markOverlayDirty();
      return;
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      store.selectAll();
      return;
    }
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      store.duplicateSelected();
      return;
    }
    if (mod && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      store.unionInPlace();
      return;
    }
    if (mod && e.key.toLowerCase() === 'j') {
      e.preventDefault();
      store.mergeLines();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (store.selectedVertices.value.length) {
        for (const v of [...store.selectedVertices.value]) store.removeVertex(v);
        store.selectedVertices.value = [];
      } else {
        store.deleteSelected();
      }
      opts.markOverlayDirty();
      return;
    }
    if (e.key === 'Escape') {
      if (store.draft.value) {
        store.cancelDraft();
        store.toast('已取消当前绘制');
      } else {
        store.clearSelection();
      }
      opts.markOverlayDirty();
      return;
    }
    if (e.key === 'Enter' && store.draft.value) {
      store.commitDraft();
      opts.markOverlayDirty();
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      if (!store.selection.value.length) return;
      const step = e.shiftKey ? 10 : store.grid.snapGrid ? store.grid.minor : 10;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (store.selectedVertices.value.length) {
        for (const ref of store.selectedVertices.value) {
          const f = store.doc.value.features.find((x) => x.id === ref.featureId);
          if (!f) continue;
          const lines = ref.which.type === 'ring' ? f.rings : f.paths;
          const p = lines[ref.which.index]?.[ref.index];
          if (!p) continue;
          store.moveVertex(ref, { x: p.x + dx, y: p.y + dy });
        }
      } else {
        store.moveBy({ x: dx, y: dy });
      }
      opts.markOverlayDirty();
      return;
    }
    const toolKeys: Record<string, ToolId> = {
      v: 'select',
      h: 'pan',
      c: 'channel',
      w: 'walkway',
      f: 'firelane',
      n: 'park',
      s: 'station',
      m: 'material',
      r: 'rect',
      p: 'polygon',
      t: 'measure',
    };
    if (!mod && toolKeys[e.key.toLowerCase()]) {
      store.tool.value = toolKeys[e.key.toLowerCase()];
      store.draft.value = null;
      opts.markOverlayDirty();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') spaceDown.value = false;
  };

  const attach = () => {
    const c = canvas();
    if (!c || attached) return;
    attached = true;
    c.addEventListener('pointerdown', onPointerDown);
    c.addEventListener('pointermove', onPointerMove);
    c.addEventListener('pointerup', onPointerUp);
    c.addEventListener('pointercancel', onPointerUp);
    c.addEventListener('dblclick', onDoubleClick);
    c.addEventListener('wheel', onWheel, { passive: false });
    c.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  };

  const detach = () => {
    const c = canvas();
    if (!c || !attached) return;
    attached = false;
    c.removeEventListener('pointerdown', onPointerDown);
    c.removeEventListener('pointermove', onPointerMove);
    c.removeEventListener('pointerup', onPointerUp);
    c.removeEventListener('pointercancel', onPointerUp);
    c.removeEventListener('dblclick', onDoubleClick);
    c.removeEventListener('wheel', onWheel);
    c.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  onMounted(attach);
  onBeforeUnmount(detach);

  return { marquee, cursor, attach, detach, spaceDown };
}
