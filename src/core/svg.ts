import type { PlanDoc, Pt } from '@shared/types';
import { generateHatchVariants } from './hatch';
import { strokeTriangles } from './stroke';
import { dist } from './math';
import { offsetPolygons } from './clipper';

export interface ExportOptions {
  /** mm per drawing unit; documents are stored in mm so default 1 */
  units?: 'mm' | 'm';
  includeDimensions?: boolean;
  includeHatch?: boolean;
  /** legacy CAD compatibility: emit paths only, no CSS beyond stroke basics */
  simple?: boolean;
  title?: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
};

function ringToPath(ring: Pt[], close: boolean): string {
  if (!ring.length) return '';
  const parts: string[] = [`M${num(ring[0].x)},${num(ring[0].y)}`];
  for (let i = 1; i < ring.length; i++) parts.push(`L${num(ring[i].x)},${num(ring[i].y)}`);
  if (close) parts.push('Z');
  return parts.join('');
}

/**
 * Render the document to SVG sized in millimetres so a sign shop / line-marking
 * contractor can open it 1:1. Hatch stripes are emitted as explicit line geometry
 * inside a clipPath, so the file needs no pattern support and prints exactly.
 */
export function exportSvg(doc: PlanDoc, opts: ExportOptions = {}): string {
  const scale = opts.units === 'm' ? 0.001 : 1;
  const w = doc.width * scale;
  const h = doc.height * scale;
  const unit = opts.units ?? 'mm';
  const title = opts.title ?? doc.name ?? '车间标线方案';
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${num(w)}${unit}" height="${num(h)}${unit}" viewBox="0 0 ${num(w)} ${num(h)}" data-units="${unit}">`
  );
  lines.push(`<title>${esc(title)}</title>`);
  lines.push(
    `<desc>Workshop floor safety marking plan. 1 drawing unit = 1 ${unit}. Generated ${new Date().toISOString()}. Features: ${doc.features.length}.</desc>`
  );
  lines.push(`<g id="background">`);
  lines.push(`<rect x="0" y="0" width="${num(w)}" height="${num(h)}" fill="#ffffff"/>`);
  if (doc.background?.visible && doc.background.url) {
    lines.push(
      `<image href="${esc(doc.background.url)}" x="${num(doc.background.x * scale)}" y="${num(doc.background.y * scale)}" width="${num(doc.background.width * scale)}" height="${num(doc.background.height * scale)}" opacity="${doc.background.opacity}" preserveAspectRatio="none"/>`
    );
  }
  lines.push(`</g>`);

  // defs: clip paths for hatches
  const defs: string[] = [];
  const body: string[] = [];
  let clipId = 0;

  doc.features.forEach((f, index) => {
    if (!f.visible) return;
    const gid = `feature-${index}-${f.id.replace(/[^\w-]/g, '')}`;
    const label = esc(f.name);
    // Inkscape layer attributes are only valid because the namespace is declared above;
    // they let the sign shop open the file with named layers per marking type.
    body.push(`<g id="${gid}" data-kind="${f.kind}" data-name="${label}" inkscape:label="${label}" inkscape:groupmode="layer">`);
    if (f.geom === 'area') {
      const fill = f.fillColor ?? 'none';
      const opacity = f.fillColor ? f.fillOpacity : 0;
      const d = f.rings.map((r) => ringToPath(r, true)).join(' ');
      body.push(`<path d="${d}" fill="${fill}" fill-opacity="${num(opacity)}" fill-rule="evenodd" stroke="none"/>`);
      // outline as filled stroke geometry for exact width
      const pick = f.outlineWidth || f.lineWidth;
      if (pick > 0) {
        const tri = strokeTriangles(
          f.rings.map((r) => ({ pts: r, closed: true })),
          pick,
          f.strokeStyle
        ).positions;
        body.push(`<path d="${triPath(tri)}" fill="${f.strokeColor}" stroke="none"/>`);
      }
      if (f.hatch && opts.includeHatch !== false && f.rings.length) {
        // Inset the clip by half the outline width so stripes stop under the border
        // instead of poking out past it (the rendered band is centred on the ring).
        const inset = (f.outlineWidth || f.lineWidth) / 2;
        const clipRings = inset > 0 ? offsetPolygons(f.rings, -inset, { join: 'miter' }) : f.rings;
        const stripes = generateHatchVariants(clipRings.length ? clipRings : f.rings, f.hatch);
        if (stripes.length) {
          const id = `hatch${clipId++}`;
          defs.push(
            `<clipPath id="${id}" clipPathUnits="userSpaceOnUse">${(clipRings.length ? clipRings : f.rings)
              .map((r) => `<path d="${ringToPath(r, true)}"/>`)
              .join('')}</clipPath>`
          );
          const byColor = new Map<string, string[]>();
          stripes.forEach((s, i) => {
            const color = f.hatch!.color2 ? (i % 2 === 0 ? f.hatch!.color : f.hatch!.color2) : f.hatch!.color;
            const arr = byColor.get(color) ?? [];
            arr.push(`M${num(s.x0)},${num(s.y0)}L${num(s.x1)},${num(s.y1)}`);
            byColor.set(color, arr);
          });
          body.push(`<g clip-path="url(#${id})" data-role="hatch" data-stripes="${stripes.length}">`);
          for (const [color, ds] of byColor) {
            body.push(
              `<path d="${ds.join('')}" stroke="${color}" stroke-opacity="${num(f.hatch!.alpha)}" stroke-width="${num(f.hatch!.lineWidth)}" stroke-linecap="butt" fill="none"/>`
            );
          }
          body.push(`</g>`);
        }
      }
      // dimension annotation
      if (opts.includeDimensions && f.rings.length) {
        const o = f.rings[0];
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (const p of o) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        // keep the label inside the sheet when the zone sits at the top edge
        const labelY = Math.max(140, minY - 80);
        body.push(
          `<text x="${num(minX)}" y="${num(labelY)}" font-family="Arial, sans-serif" font-size="120" fill="#334155">${esc(f.name)} ${num((maxX - minX) / 1000)}×${num((maxY - minY) / 1000)}m</text>`
        );
      }
    } else {
      const pick = f.lineWidth;
      const tri = strokeTriangles(
        f.paths.map((p) => ({ pts: p, closed: false })),
        pick,
        'solid'
      ).positions;
      if (tri.length) body.push(`<path d="${triPath(tri)}" fill="${f.strokeColor}" stroke="none" data-width-mm="${num(pick)}"/>`);
    }
    body.push(`</g>`);
  });

  if (defs.length) lines.push(`<defs>${defs.join('')}</defs>`);
  lines.push(...body);

  // scale bar + legend
  lines.push(`<g id="annotations" font-family="Arial, sans-serif">`);
  const sbX = 500;
  const sbY = doc.height - 500;
  const sbLen = 1000;
  lines.push(`<g stroke="#1f2937" stroke-width="20" fill="none">`);
  lines.push(`<path d="M${num(sbX)},${num(sbY)}h${num(sbLen)}"/>`);
  for (let i = 0; i <= 4; i++) {
    const x = sbX + (sbLen * i) / 4;
    lines.push(`<path d="M${num(x)},${num(sbY - 60)}v120"/>`);
  }
  lines.push(`</g>`);
  lines.push(`<text x="${num(sbX)}" y="${num(sbY + 220)}" font-size="140" fill="#1f2937">0 — 1 m</text>`);
  lines.push(`<text x="${num(sbX)}" y="${num(sbY - 120)}" font-size="140" fill="#1f2937">${esc(title)}</text>`);
  lines.push(`</g>`);
  lines.push('</svg>');
  return lines.join('\n');
}

function triPath(tris: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < tris.length; i += 6) {
    parts.push(`M${num(tris[i])},${num(tris[i + 1])}L${num(tris[i + 2])},${num(tris[i + 3])}L${num(tris[i + 4])},${num(tris[i + 5])}Z`);
  }
  return parts.join('');
}

/** Minimal GeoJSON-ish export for GIS handoff (mm -> m). */
export function exportGeoJson(doc: PlanDoc): string {
  const features = doc.features
    .filter((f) => f.visible)
    .map((f) => {
      const rings =
        f.geom === 'area'
          ? f.rings.map((r) => [...r, r[0]].map((p) => [p.x / 1000, p.y / 1000]))
          : f.paths.map((p) => p.map((q) => [q.x / 1000, q.y / 1000]));
      const geometry =
        f.geom === 'area'
          ? { type: 'Polygon', coordinates: rings }
          : { type: 'MultiLineString', coordinates: rings };
      return {
        type: 'Feature',
        properties: {
          id: f.id,
          name: f.name,
          kind: f.kind,
          lineWidthMm: f.lineWidth,
          strokeColor: f.strokeColor,
          fillColor: f.fillColor,
        },
        geometry,
      };
    });
  return JSON.stringify({ type: 'FeatureCollection', name: doc.name, features }, null, 2);
}

/** Exports the centerlines as a CSV cut list for line-marking crews. */
export function exportLengthList(doc: PlanDoc): string {
  const rows: string[] = ['对象,类型,线宽(mm),长度(m),面积(㎡),预计油漆(l)'];
  for (const f of doc.features) {
    if (!f.visible) continue;
    if (f.geom === 'path') {
      let total = 0;
      for (const p of f.paths) for (let i = 0; i + 1 < p.length; i++) total += dist(p[i], p[i + 1]);
      // 1 mm wide strip of paint ~ 1/1000 l per m per mm width approximation
      const liters = (total / 1000) * (f.lineWidth / 1000) * 0.45 * 1000;
      rows.push([f.name, '标线', String(f.lineWidth), (total / 1000).toFixed(2), '', liters.toFixed(2)].join(','));
    } else {
      const rings = f.rings;
      let area = 0;
      for (const r of rings) {
        let a = 0;
        for (let i = 0; i < r.length; i++) {
          const p = r[i];
          const q = r[(i + 1) % r.length];
          a += p.x * q.y - q.x * p.y;
        }
        area += a / 2;
      }
      rows.push([f.name, '区域', String(f.outlineWidth || f.lineWidth), '', (Math.abs(area) / 1e6).toFixed(2), ''].join(','));
    }
  }
  return '﻿' + rows.join('\n');
}

export { ringToPath };
