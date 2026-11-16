import type { FlatPattern } from '@pg/shared';
import { buildDxf } from './dxf.js';
import { buildSvg } from './svg.js';

export interface DownloadOptions {
  filename: string;
  mime: string;
}

/** 浏览器端触发文件下载（车间导出入口） */
export function downloadTextFile(content: string, options: DownloadOptions): void {
  const blob = new Blob([content], { type: options.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDxf(pattern: FlatPattern, filename: string, title?: string): void {
  downloadTextFile(buildDxf(pattern, title), { filename, mime: 'application/dxf' });
}

export function downloadSvg(pattern: FlatPattern, filename: string, title?: string): void {
  downloadTextFile(buildSvg(pattern, title), { filename, mime: 'image/svg+xml' });
}
