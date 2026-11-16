/** 轻量 DOM 构建器，Web Components 内部统一使用，避免字符串拼接。 */
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Array<Node | string | number | null | undefined>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    } else if (k === 'class') {
      el.className = String(v);
    } else if (k === 'html') {
      el.innerHTML = String(v);
    } else if (k === 'text') {
      el.textContent = String(v);
    } else if (k === 'style') {
      el.setAttribute('style', String(v));
    } else if (v === true) {
      el.setAttribute(k, '');
    } else {
      el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function clear(el: ParentNode): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

export function pct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
  return wrapped as T;
}

export function download(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** 用于自测：读取像素颜色 */
export function canvasSnapshot(canvas: HTMLCanvasElement): ImageData | null {
  try {
    const gl = canvas.getContext('webgl2');
    if (!gl) return null;
    const w = gl.drawingBufferWidth;
    const hgt = gl.drawingBufferHeight;
    const pixels = new Uint8Array(w * hgt * 4);
    gl.readPixels(0, 0, w, hgt, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return new ImageData(new Uint8ClampedArray(pixels), w, hgt);
  } catch {
    return null;
  }
}
