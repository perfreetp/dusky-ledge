import type { MultiPolygon } from 'polygon-clipping';
import { patternBounds } from './boolean';

/**
 * 把花型导出为 SVG 切割路径(单位 mm,Y 轴翻转为切割设备常用的左上原点)。
 * 外环与孔洞写在同一个 path 里,fill-rule="evenodd"。
 */
export function patternToSvg(mp: MultiPolygon, name: string): string {
  const bounds = patternBounds(mp);
  if (!bounds) return '';
  const pad = 1; // 1mm 边距
  const w = bounds.max.x - bounds.min.x + pad * 2;
  const h = bounds.max.y - bounds.min.y + pad * 2;
  const flipY = (y: number) => bounds.max.y - y + pad;

  const parts: string[] = [];
  for (const poly of mp) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      const cmds: string[] = [];
      ring.forEach(([x, y], i) => {
        const px = +(x - bounds.min.x + pad).toFixed(3);
        const py = +flipY(y).toFixed(3);
        cmds.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`);
      });
      cmds.push('Z');
      parts.push(`<path d="${cmds.join(' ')}" fill-rule="evenodd"/>`);
    }
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- ${name} 切割路径, 单位: mm -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">`,
    `<g fill="none" stroke="#000" stroke-width="0.1">`,
    ...parts,
    `</g>`,
    `</svg>`,
  ].join('\n');
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
