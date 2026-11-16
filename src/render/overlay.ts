import type { Feature, Pt } from '@shared/types';
import { featureBoundsInclStroke, featureRings } from '@/core/feature';
import type { Camera, VertexRef } from '@/state/editor';
import { dist, rectCenter, type Rect } from '@/core/math';

export interface OverlayState {
  camera: Camera;
  dpr: number;
  grid: { minor: number; major: number; show: boolean };
  docWidth: number;
  docHeight: number;
  features: Feature[];
  selected: Feature[];
  selectedVertices: VertexRef[];
  draft: { points: Pt[]; cursor: Pt | null; kind: string } | null;
  snap: { point: Pt; kind: string } | null;
  marquee: Rect | null;
  hoverId: string | null;
  showDimensions: boolean;
  calibration?: { step: 1 | 2; p1: Pt | null; p2: Pt | null } | null;
  /** px radius of vertex handles */
  handleSize?: number;
  accent?: string;
}

const imageCache = new Map<string, { img: HTMLImageElement; ready: boolean }>();

export function preloadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const hit = imageCache.get(url);
    if (hit?.ready) return resolve(hit.img);
    if (hit) {
      hit.img.addEventListener('load', () => resolve(hit.img), { once: true });
      hit.img.addEventListener('error', reject, { once: true });
      return;
    }
    const img = new Image();
    const entry = { img, ready: false };
    imageCache.set(url, entry);
    img.onload = () => {
      entry.ready = true;
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ACCENT = '#38bdf8';
const HANDLE = '#0ea5e9';

export function drawOverlay(ctx: CanvasRenderingContext2D, s: OverlayState): void {
  const { camera, dpr } = s;
  const w = camera.width;
  const h = camera.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const toScreen = (p: Pt): Pt => ({ x: (p.x - camera.tx) / camera.scale, y: (p.y - camera.ty) / camera.scale });
  const scale = 1 / camera.scale; // px per mm

  if (s.grid.show) drawGrid(ctx, s, toScreen);

  // hover highlight
  if (s.hoverId) {
    const f = s.features.find((x) => x.id === s.hoverId);
    if (f) strokeFeature(ctx, f, toScreen, 'rgba(148,163,184,.75)', 1.5, [4, 4]);
  }

  // selection
  for (const f of s.selected) {
    strokeFeature(ctx, f, toScreen, ACCENT, 2, []);
    if (s.showDimensions) drawFeatureDimensions(ctx, f, toScreen, scale);
  }

  // vertex handles for single selection (or area with selected vertices)
  if (s.selected.length === 1 || s.selectedVertices.length) {
    drawHandles(ctx, s, toScreen);
  }

  // selection bounds + size label
  if (s.selected.length > 1) {
    const b = s.selected.reduce<Rect>(
      (acc, f) => {
        const fb = featureBoundsInclStroke(f);
        return {
          minX: Math.min(acc.minX, fb.minX),
          minY: Math.min(acc.minY, fb.minY),
          maxX: Math.max(acc.maxX, fb.maxX),
          maxY: Math.max(acc.maxY, fb.maxY),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    drawBoundsBox(ctx, b, toScreen, scale, s.selected.length);
  }

  // draft
  if (s.draft) drawDraft(ctx, s, toScreen, scale);

  // marquee
  if (s.marquee) {
    const a = toScreen({ x: s.marquee.minX, y: s.marquee.minY });
    const b = toScreen({ x: s.marquee.maxX, y: s.marquee.maxY });
    ctx.save();
    ctx.fillStyle = 'rgba(56,189,248,.12)';
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.restore();
  }

  // calibration guide
  if (s.calibration) drawCalibration(ctx, s.calibration, toScreen, scale);

  // snap marker
  if (s.snap) drawSnap(ctx, s.snap, toScreen);
}

function drawGrid(ctx: CanvasRenderingContext2D, s: OverlayState, toScreen: (p: Pt) => Pt) {
  const { camera } = s;
  const worldW = camera.width * camera.scale;
  let minor = s.grid.minor;
  // adapt grid density so lines never get closer than 8px
  while (minor / camera.scale < 8) minor *= 5;
  const major = minor * Math.max(1, Math.round(s.grid.major / s.grid.minor) || 4);

  const x0 = Math.floor(camera.tx / minor) * minor;
  const x1 = camera.tx + worldW;
  const y0 = Math.floor(camera.ty / minor) * minor;
  const y1 = camera.ty + camera.height * camera.scale;

  ctx.save();
  const paperA = toScreen({ x: 0, y: 0 });
  const paperB = toScreen({ x: s.docWidth, y: s.docHeight });
  ctx.beginPath();
  ctx.rect(paperA.x, paperA.y, paperB.x - paperA.x, paperB.y - paperA.y);
  ctx.clip();
  ctx.lineWidth = 1;
  for (let x = x0; x <= x1; x += minor) {
    const sp = toScreen({ x, y: 0 }).x;
    const isMajor = Math.abs(x % major) < 1e-6;
    ctx.strokeStyle = isMajor ? 'rgba(51,65,85,.28)' : 'rgba(71,85,105,.10)';
    ctx.beginPath();
    ctx.moveTo(Math.round(sp) + 0.5, 0);
    ctx.lineTo(Math.round(sp) + 0.5, camera.height);
    ctx.stroke();
  }
  for (let y = y0; y <= y1; y += minor) {
    const sp = toScreen({ x: 0, y }).y;
    const isMajor = Math.abs(y % major) < 1e-6;
    ctx.strokeStyle = isMajor ? 'rgba(51,65,85,.28)' : 'rgba(71,85,105,.10)';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sp) + 0.5);
    ctx.lineTo(camera.width, Math.round(sp) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function pathOf(ctx: CanvasRenderingContext2D, rings: Pt[][], toScreen: (p: Pt) => Pt, close: boolean) {
  ctx.beginPath();
  for (const ring of rings) {
    if (!ring.length) continue;
    const p0 = toScreen(ring[0]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < ring.length; i++) {
      const p = toScreen(ring[i]);
      ctx.lineTo(p.x, p.y);
    }
    if (close) ctx.closePath();
  }
}

function strokeFeature(
  ctx: CanvasRenderingContext2D,
  f: Feature,
  toScreen: (p: Pt) => Pt,
  color: string,
  width: number,
  dash: number[]
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  if (f.geom === 'area') {
    pathOf(ctx, f.rings, toScreen, true);
    ctx.stroke();
  } else {
    pathOf(ctx, f.paths, toScreen, false);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHandles(ctx: CanvasRenderingContext2D, s: OverlayState, toScreen: (p: Pt) => Pt) {
  const size = s.handleSize ?? 4;
  ctx.save();
  for (const f of s.selected) {
    const lines = f.geom === 'area' ? f.rings : f.paths;
    lines.forEach((line, li) => {
      const n = line.length;
      const closed = f.geom === 'area';
      const count = closed ? n : n;
      for (let i = 0; i < count; i++) {
        const p = toScreen(line[i]);
        const isSel = s.selectedVertices.some(
          (v) =>
            v.featureId === f.id &&
            v.index === i &&
            ((closed && v.which.type === 'ring' && v.which.index === li) || (!closed && v.which.type === 'path' && v.which.index === li))
        );
        ctx.fillStyle = isSel ? ACCENT : '#fff';
        ctx.strokeStyle = isSel ? '#fff' : HANDLE;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.rect(p.x - size, p.y - size, size * 2, size * 2);
        ctx.fill();
        ctx.stroke();
      }
      // midpoints on hover for insertion (small hollow dots)
      if (n >= 2) {
        for (let i = 0; i < (closed ? n : n - 1); i++) {
          const a = line[i];
          const b = line[(i + 1) % n];
          const m = toScreen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = HANDLE;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    });
  }
  ctx.restore();
}

function drawBoundsBox(ctx: CanvasRenderingContext2D, b: Rect, toScreen: (p: Pt) => Pt, scale: number, count: number) {
  const a = toScreen({ x: b.minX, y: b.minY });
  const c = toScreen({ x: b.maxX, y: b.maxY });
  ctx.save();
  ctx.strokeStyle = 'rgba(56,189,248,.65)';
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.strokeRect(a.x, a.y, c.x - a.x, c.y - a.y);
  const label = `${((b.maxX - b.minX) / 1000).toFixed(2)} × ${((b.maxY - b.minY) / 1000).toFixed(2)} m · ${count} 个对象`;
  ctx.setLineDash([]);
  ctx.font = '11px ui-sans-serif, system-ui';
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = 'rgba(15,23,42,.88)';
  ctx.fillRect(a.x, a.y - 20, tw + 12, 18);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(label, a.x + 6, a.y - 7);
  void scale;
  ctx.restore();
}

function drawFeatureDimensions(ctx: CanvasRenderingContext2D, f: Feature, toScreen: (p: Pt) => Pt, scale: number) {
  const b = featureBoundsInclStroke(f);
  const a = toScreen({ x: b.minX, y: b.minY });
  const c = toScreen({ x: b.maxX, y: b.maxY });
  const wMm = b.maxX - b.minX;
  const hMm = b.maxY - b.minY;
  if (wMm * scale < 42 && hMm * scale < 24) return;
  ctx.save();
  ctx.font = '10.5px ui-sans-serif, system-ui';
  ctx.fillStyle = 'rgba(2,132,199,.95)';
  ctx.strokeStyle = 'rgba(2,132,199,.7)';
  ctx.lineWidth = 1;
  // width dimension above
  const y = a.y - 10;
  ctx.beginPath();
  ctx.moveTo(a.x, y);
  ctx.lineTo(c.x, y);
  ctx.stroke();
  const wText = `${(wMm / 1000).toFixed(2)} m`;
  const ww = ctx.measureText(wText).width;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillRect((a.x + c.x) / 2 - ww / 2 - 3, y - 8, ww + 6, 13);
  ctx.fillStyle = '#075985';
  ctx.fillText(wText, (a.x + c.x) / 2 - ww / 2, y + 2);
  // height dimension left
  const x = a.x - 10;
  ctx.strokeStyle = 'rgba(2,132,199,.7)';
  ctx.beginPath();
  ctx.moveTo(x, a.y);
  ctx.lineTo(x, c.y);
  ctx.stroke();
  const hText = `${(hMm / 1000).toFixed(2)} m`;
  ctx.save();
  ctx.translate(x - 4, (a.y + c.y) / 2);
  ctx.rotate(-Math.PI / 2);
  const hw = ctx.measureText(hText).width;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillRect(-hw / 2 - 3, -8, hw + 6, 13);
  ctx.fillStyle = '#075985';
  ctx.fillText(hText, -hw / 2, 2);
  ctx.restore();
  ctx.restore();
}

function drawDraft(ctx: CanvasRenderingContext2D, s: OverlayState, toScreen: (p: Pt) => Pt, scale: number) {
  const d = s.draft!;
  const pts = d.cursor ? [...d.points, d.cursor] : d.points;
  if (pts.length < 2) {
    if (d.cursor) {
      const sp = toScreen(d.cursor);
      ctx.save();
      ctx.fillStyle = ACCENT;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  const p0 = toScreen(pts[0]);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < pts.length; i++) {
    const p = toScreen(pts[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = ACCENT;
  for (const p of d.points) {
    const sp = toScreen(p);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // live readout of the last segment
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  if (a && b) {
    const len = dist(a, b);
    if (len * scale > 24) {
      const m = toScreen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const label = `${(len / 1000).toFixed(2)} m / ${ang.toFixed(1)}°`;
      ctx.font = '11px ui-sans-serif, system-ui';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(15,23,42,.9)';
      ctx.fillRect(m.x + 10, m.y - 22, tw + 10, 17);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillText(label, m.x + 15, m.y - 10);
    }
  }
  if (d.kind === 'rect') {
    const a0 = d.points[0];
    const b0 = d.cursor ?? d.points[d.points.length - 1];
    const sa = toScreen(a0);
    const sb = toScreen(b0);
    ctx.strokeStyle = 'rgba(56,189,248,.8)';
    ctx.strokeRect(sa.x, sa.y, sb.x - sa.x, sb.y - sa.y);
  }
  ctx.restore();
}

function drawCalibration(
  ctx: CanvasRenderingContext2D,
  cal: { step: 1 | 2; p1: Pt | null; p2: Pt | null },
  toScreen: (p: Pt) => Pt,
  scale: number
) {
  ctx.save();
  ctx.strokeStyle = '#a78bfa';
  ctx.fillStyle = 'rgba(167,139,250,.9)';
  ctx.lineWidth = 1.6;
  if (cal.p1) {
    const a = toScreen(cal.p1);
    ctx.beginPath();
    ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,.8)';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x - 14, a.y);
    ctx.lineTo(a.x + 14, a.y);
    ctx.moveTo(a.x, a.y - 14);
    ctx.lineTo(a.x, a.y + 14);
    ctx.stroke();
  }
  if (cal.p1 && cal.p2) {
    const a = toScreen(cal.p1);
    const b = toScreen(cal.p2);
    ctx.setLineDash([]);
    ctx.strokeStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    const mm = dist(cal.p1, cal.p2);
    const label = `标定线 ${(mm / 1000).toFixed(2)} m`;
    ctx.font = '11.5px ui-sans-serif, system-ui';
    const tw = ctx.measureText(label).width;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.fillStyle = 'rgba(15,23,42,.92)';
    ctx.fillRect(mx - tw / 2 - 6, my - 22, tw + 12, 18);
    ctx.fillStyle = '#ddd6fe';
    ctx.fillText(label, mx - tw / 2, my - 9);
  }
  void scale;
  ctx.restore();
}

function drawSnap(ctx: CanvasRenderingContext2D, snap: { point: Pt; kind: string }, toScreen: (p: Pt) => Pt) {
  const p = toScreen(snap.point);
  ctx.save();
  ctx.strokeStyle = '#f472b6';
  ctx.fillStyle = 'rgba(244,114,182,.16)';
  ctx.lineWidth = 1.4;
  if (snap.kind === 'midpoint') {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 7);
    ctx.lineTo(p.x + 7, p.y + 5);
    ctx.lineTo(p.x - 7, p.y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (snap.kind === 'grid') {
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x + 5, p.y);
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x, p.y + 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.rect(p.x - 5, p.y - 5, 10, 10);
    ctx.fill();
    ctx.stroke();
  }
  const labels: Record<string, string> = {
    endpoint: '端点',
    midpoint: '中点',
    segment: '线上',
    grid: '网格',
    center: '中心',
  };
  const text = labels[snap.kind] ?? snap.kind;
  ctx.font = '10.5px ui-sans-serif, system-ui';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(15,23,42,.9)';
  ctx.fillRect(p.x + 10, p.y + 6, tw + 10, 16);
  ctx.fillStyle = '#fbcfe8';
  ctx.fillText(text, p.x + 15, p.y + 17);
  ctx.restore();
}

/** Ruler ticks along the top/left edges. */
export function drawRulers(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  dpr: number,
  size = 22
): void {
  const w = camera.width;
  const h = camera.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, h);
  ctx.clearRect(0, 0, w, size);
  ctx.save();
  ctx.fillStyle = 'rgba(15,23,42,.92)';
  ctx.fillRect(0, 0, w, size);
  ctx.fillRect(0, 0, size, h);

  let step = 1000;
  while (step / camera.scale < 42) step *= 2;
  const startX = Math.floor(camera.tx / step) * step;
  const endX = camera.tx + w * camera.scale;
  ctx.font = '9.5px ui-monospace, monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  for (let x = startX; x <= endX; x += step) {
    const sx = (x - camera.tx) / camera.scale;
    if (sx < size) continue;
    ctx.beginPath();
    ctx.moveTo(Math.round(sx) + 0.5, size - 6);
    ctx.lineTo(Math.round(sx) + 0.5, size);
    ctx.stroke();
    ctx.fillText(`${(x / 1000).toFixed(x % 1000 ? 1 : 0)}m`, sx + 3, 10);
  }
  const startY = Math.floor(camera.ty / step) * step;
  const endY = camera.ty + h * camera.scale;
  for (let y = startY; y <= endY; y += step) {
    const sy = (y - camera.ty) / camera.scale;
    if (sy < size) continue;
    ctx.beginPath();
    ctx.moveTo(size - 6, Math.round(sy) + 0.5);
    ctx.lineTo(size, Math.round(sy) + 0.5);
    ctx.stroke();
    ctx.save();
    ctx.translate(9, sy + 3);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${(y / 1000).toFixed(y % 1000 ? 1 : 0)}m`, 0, 0);
    ctx.restore();
  }
  // cursor position marker
  ctx.restore();
}

export { featureRings, rectCenter };
