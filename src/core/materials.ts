export interface SoilMaterial {
  id: number;
  name: string;
  short: string;
  hex: string;
}

/** id 0 = 空。1..8 为土色/堆积类型，渲染与统计都以材质 id 为键。 */
export const MATERIALS: readonly SoilMaterial[] = [
  { id: 1, name: '灰褐土', short: '灰褐', hex: '#8d7c66' },
  { id: 2, name: '黄褐土', short: '黄褐', hex: '#b89966' },
  { id: 3, name: '红褐土', short: '红褐', hex: '#a2674c' },
  { id: 4, name: '深灰土', short: '深灰', hex: '#5f5d59' },
  { id: 5, name: '浅黄土', short: '浅黄', hex: '#d2bb8a' },
  { id: 6, name: '灰黑土', short: '灰黑', hex: '#413d38' },
  { id: 7, name: '灰白土', short: '灰白', hex: '#b7b2a2' },
  { id: 8, name: '炭屑层', short: '炭屑', hex: '#2e2a25' },
] as const;

export const MATERIAL_MAX = 8;

export function getMaterial(id: number): SoilMaterial {
  const found = MATERIALS.find((m) => m.id === id);
  return found ?? MATERIALS[0];
}

export function materialColor(id: number): string {
  return getMaterial(id).hex;
}

/** sRGB hex -> [r,g,b] in 0..1 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = Number.parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}
