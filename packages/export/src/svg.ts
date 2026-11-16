import type { FlatPattern } from '@pg/shared';

/** 下料图 SVG（浏览器预览/打印用），坐标与 DXF 一致，单位 mm */
export function buildSvg(pattern: FlatPattern, title = '护套下料图'): string {
  const pts = (arr: { from: [number, number]; to: [number, number] }[]) =>
    arr
      .map(
        (l) =>
          `<line x1="${l.from[0].toFixed(2)}" y1="${l.from[1].toFixed(2)}" x2="${l.to[0].toFixed(
            2,
          )}" y2="${l.to[1].toFixed(2)}"/>`,
      )
      .join('\n');

  const outlinePoints = pattern.outline.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${pattern.width}mm" height="${pattern.height}mm"
  viewBox="0 0 ${pattern.width} ${pattern.height}" font-family="sans-serif">
  <rect x="0" y="0" width="${pattern.width}" height="${pattern.height}" fill="white"/>
  <g stroke="#999" stroke-width="0.2">${pts(pattern.gridLines)}</g>
  <polygon points="${outlinePoints}" fill="none" stroke="#111" stroke-width="0.6"/>
  <g stroke="#d40000" stroke-width="0.5">${pts(pattern.cutLines)}</g>
  <g stroke="#2e7d32" stroke-width="0.4">${pts(pattern.alignmentMarks)}</g>
  <text x="2" y="${pattern.height - 4}" font-size="6" fill="#111">${escapeXml(title)}</text>
  ${pattern.labels
    .map(
      (l) =>
        `<text x="${l.position[0].toFixed(2)}" y="${l.position[1].toFixed(2)}" font-size="${l.size}" fill="#333">${escapeXml(
          l.text,
        )}</text>`,
    )
    .join('\n')}
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
